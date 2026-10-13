import { setupCamera } from "./camera.js";
import { createFaceLandmarker } from "./face.js";
import {calcEAR,LEFT_EYE} from "./blink.js";
import {updateUI} from "./ui.js";
import {saveRecord,loadRecords,clearRecords} from "./storage.js";
import {drawBPMChart,drawIntervalCVChart,drawDurationChart,drawStressChart} from "./chart.js";

const video = document.getElementById("video");
const info = document.getElementById("info");
const stateDiv = document.getElementById("state");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const clearBtn = document.getElementById("clearBtn");
const exportBtn = document.getElementById("exportBtn");
const historyDiv = document.getElementById("history");

// =====================
// 設定
// =====================

const BASELINE_BPM = 15;
const MARGIN = 3;
const EAR_HISTORY_SIZE = 30;
const BLINK_CLOSE_RATIO = 0.65;
const BLINK_OPEN_RATIO = 0.75;
const K_CV = 0.5;
const K_DURATION = 0.5;
const intervals = [];

// =====================
// 状態変数
// =====================

let blinkCount = 0;
let blinkFlag = false;
let blinkTimes = [];
let paused = false;
let startTimestamp = Date.now();
let pauseStart = 0;
let totalPausedTime = 0;
let earHistory = [];
let historyText = "";
let graphData = loadRecords();
let lastPlotTime = Date.now();
let blinkStartTime = null;
let blinkDurations = [];

// =====================
// 過去データ
// =====================

const records = loadRecords();

const latest =
    records.length > 0
        ? records[records.length - 1]
        : null;

if(latest){
    historyText =
`
Last Session
Blinks : ${latest.totalBlinks}
Minutes : ${latest.sessionMinutes}
`;
}

// =====================
// ボタン処理
// =====================

pauseBtn.onclick = ()=>{
    paused = !paused;
    if(paused){
        pauseStart = Date.now();
        pauseBtn.innerText = "Resume";
    }else{
        totalPausedTime += Date.now() - pauseStart;
        pauseBtn.innerText = "Pause";
    }
};

resetBtn.onclick = ()=>{
    blinkCount = 0;
    blinkTimes = [];
    earHistory = [];
    blinkFlag = false;
    startTimestamp = Date.now();
    totalPausedTime = 0;
    pauseStart = 0;
    paused = false;
    blinkStartTime = null;
    blinkDurations = [];
    lastPlotTime = Date.now();
    pauseBtn.innerText = "Pause";
};

clearBtn.onclick = ()=>{
    if(confirm("履歴を全削除しますか？")){
        clearRecords();
        graphData = [];
        drawBPMChart([]);
        drawIntervalCVChart([]);
        drawDurationChart([]);
        drawStressChart([]);
    }
};

    // =====================
    // CSV出力
    // =====================

    exportBtn.onclick = () => {
        const records = loadRecords();

        if (records.length === 0) {
            alert("出力できるデータがありません。");
            return;
        }

        const headers = [
            "Elapsed_Minutes",
            "Blink_Count_Per_Minute",
            "Blink_Interval_CV",
            "Average_Blink_Duration_sec",
            "Duration_Relative_Deviation",
            "Stress_Score"
        ];

        const rows = records.map(record => [
            record.time ?? "",
            record.bpm ?? "",
            record.intervalCV ?? "",
            record.avgBlinkDuration ?? "",
            record.durationDeviation ?? "",
            record.stressScore ?? ""
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row =>
                row.map(value => {
                    const text = String(value);

                    return `"${text.replace(/"/g, '""')}"`;
                }).join(",")
            )
        ].join("\r\n");

        // Excelで開いたときの文字コード対策
        const bom = "\uFEFF";

        const blob = new Blob(
            [bom + csvContent],
            { type: "text/csv;charset=utf-8;" }
        );

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = `blink_data_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    };

// =====================
// 瞬き間隔の揺らぎ
// =====================

function calculateBlinkVariability(blinkTimes){
    if(blinkTimes.length < 3){
        return {
            intervals: [],
            average: 0,
            stdDev: 0,
            cv: 0
        };
    }

    for(let i = 1; i < blinkTimes.length; i++){
        const interval = (blinkTimes[i] - blinkTimes[i - 1]) / 1000;
        intervals.push(interval);
    }

    const average =intervals.reduce((sum, v) => sum + v , 0) / intervals.length;
    const variance =intervals.reduce((sum, v) => sum + Math.pow(v - average, 2),0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const cv = average > 0? stdDev / average: 0;

    return {
        intervals,
        average,
        stdDev,
        cv
    };
}


// =====================
// メイン処理
// =====================

async function predict(faceLandmarker){
    if(paused){
        requestAnimationFrame(
            () => predict(faceLandmarker)
        );
        return;
    }

    const currentTime = Date.now();
    const elapsedSec = (currentTime - startTimestamp - totalPausedTime) / 1000;

    // =====================
    // FaceLandmarkerで顔認識
    // =====================

    const results =
        faceLandmarker.detectForVideo(
            video,
            currentTime
        );

    // =====================
    // 顔が検出された場合
    // =====================

    if(results.faceLandmarks.length > 0){
        const landmarks = results.faceLandmarks[0];

        // =====================
        // 左目のランドマーク取得
        // =====================

        const eyePoints = LEFT_EYE.map(i => landmarks[i]);

        // =====================
        // EAR計算
        // =====================

        const ear = calcEAR(eyePoints);
        earHistory.push(ear);
        if(earHistory.length > EAR_HISTORY_SIZE){
            earHistory.shift();
        }

        // =====================
        // 開眼時のみEAR履歴を更新
        // =====================

        if (!blinkFlag) {
            earHistory.push(ear);

            if (earHistory.length > EAR_HISTORY_SIZE) {
                earHistory.shift();
            }
        }

        const baselineEAR =
            earHistory.length > 0
                ? earHistory.reduce((sum, v) => sum + v, 0)
                    / earHistory.length
                : ear;

        // =====================
        // 瞬き判定（ヒステリシス）
        // =====================

        if (earHistory.length >= EAR_HISTORY_SIZE) {

            // 開眼状態から閉眼状態へ
            if (!blinkFlag && ear < baselineEAR * BLINK_CLOSE_RATIO) {

                blinkCount++;
                blinkFlag = true;
                blinkStartTime = currentTime;
                blinkTimes.push(currentTime);

            }

            // 閉眼状態から開眼状態へ
            else if (blinkFlag && ear > baselineEAR * BLINK_OPEN_RATIO) {

                const duration =
                    (currentTime - blinkStartTime) / 1000;

                blinkDurations.push({
                    time: currentTime,
                    duration: duration
                });

                blinkStartTime = null;
                blinkFlag = false;
            }
        }

        // =====================
        // 直近1分の瞬き
        // =====================

        blinkTimes =blinkTimes.filter(t => currentTime - t <= 60000);
        blinkDurations = blinkDurations.filter(item => currentTime - item.time <= 60000);

        // =====================
        // 平均瞬き時間
        // =====================

        const averageBlinkDuration = blinkDurations.length > 0? blinkDurations.reduce((sum, item) =>sum + item.duration , 0) / blinkDurations.length: 0;

        // =====================
        // 最新の瞬き時間
        // =====================

        const currentBlinkDuration = blinkDurations.length > 0? blinkDurations[blinkDurations.length - 1].duration: 0;

        // =====================
        // 瞬き時間の相対偏差
        // =====================

        const blinkDurationRelativeDeviation =averageBlinkDuration > 0? (
            currentBlinkDuration- averageBlinkDuration
            ) / averageBlinkDuration: 0;

        // =====================
        // 直近1分の瞬き回数
        // =====================

        const recentBlinks = blinkTimes.length;

        // =====================
        // 瞬き間隔CV
        // =====================

        const blinkVariability = calculateBlinkVariability(blinkTimes);

        // =====================
        // 平均BPM
        // =====================

        const measuredAvg = elapsedSec > 0 ? (blinkCount / elapsedSec) * 60: 0;

        let avgBPM;
        if(elapsedSec < 120){
            avgBPM = (BASELINE_BPM + measuredAvg) / 2;
        }else{
            avgBPM = measuredAvg;
        }

        // =====================
        // ストレススコア
        // =====================

        const blinkDeviation = recentBlinks - avgBPM;
        const stressScore = blinkDeviation * (1 + K_CV * blinkVariability.cv) * (1 + K_DURATION * blinkDurationRelativeDeviation);

        // =====================
        // グラフ更新
        // =====================

        if(currentTime - lastPlotTime >= 60000){
            const point = {
                time:Math.floor(elapsedSec / 60),
                bpm:recentBlinks,
                intervalCV:blinkVariability.cv,
                avgBlinkDuration:averageBlinkDuration,
                durationDeviation:blinkDurationRelativeDeviation,
                stressScore:stressScore
            };

            graphData.push(point);
            saveRecord(point);
            drawBPMChart(graphData);
            drawIntervalCVChart(graphData);
            drawDurationChart(graphData);
            drawStressChart(graphData);
            lastPlotTime = currentTime;
        }

        // =====================
        // 状態判定
        // =====================

        let stateText;
        let stateClass;
        if(recentBlinks > avgBPM + MARGIN){
            stateText = "Stress?";
            stateClass = "stress";
        }else if(recentBlinks < avgBPM - MARGIN){
            stateText = "Hyperfocus / Fatigue?";
            stateClass = "fatigue";
        }else{
            stateText = "Normal";
            stateClass = "normal";
        }

        // =====================
        // UI更新
        // =====================

        updateUI(info , stateDiv,{
                ear,
                baselineEAR,
                total:blinkCount,
                avg:avgBPM,
                recent:recentBlinks,
                elapsed:elapsedSec,
                blinkCV:blinkVariability.cv,
                blinkDuration:currentBlinkDuration,
                blinkDurationAvg:averageBlinkDuration,
                blinkDurationDeviation:blinkDurationRelativeDeviation,
                stateText,
                stateClass
            }
        );
    }

    // =====================
    // 次のフレーム
    // =====================

    requestAnimationFrame(() => predict(faceLandmarker));
}

// =====================
// 起動処理
// =====================

async function start(){
    try{

        // =====================
        // カメラ起動
        // =====================

        await setupCamera(video);

        // =====================
        // FaceLandmarker作成
        // =====================

        const faceLandmarker = await createFaceLandmarker();

        // =====================
        // グラフ表示
        // =====================

        drawBPMChart(graphData);
        drawIntervalCVChart(graphData);
        drawDurationChart(graphData);
        drawStressChart(graphData);

        // =====================
        // 推論開始
        // =====================

        predict(faceLandmarker);
    }catch(error){
        alert("カメラまたはFaceLandmarkerの起動に失敗しました。\n\n" + error.message);
    }
}

// =====================
// アプリ開始
// =====================

start();