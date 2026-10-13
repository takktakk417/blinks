let bpmChart = null;
let intervalCVChart = null;
let durationChart = null;
let stressChart = null;


// =====================
// 共通設定
// =====================

const chartOptions = {

    responsive: true,
    maintainAspectRatio: false,

    animation: false,

    plugins: {

        legend: {
            display: true
        }

    }

};


// =====================
// BPM
// =====================

export function drawBPMChart(data){

    const ctx =
        document.getElementById("blinkChart");

    if(!ctx){
        return;
    }

    if(bpmChart){
        bpmChart.destroy();
    }

    bpmChart = new Chart(ctx, {

        type: "line",

        data: {

            labels:
                data.map(
                    p => p.time
                ),

            datasets: [{

                label: "Blink BPM",

                data:
                    data.map(
                        p => p.bpm
                    ),

                tension: 0.2,

                pointRadius: 3,

                pointHoverRadius: 5

            }]

        },

        options: {

            ...chartOptions,

            scales: {

                x: {

                    title: {
                        display: true,
                        text: "Time (min)"
                    }

                },

                y: {

                    title: {
                        display: true,
                        text: "Blinks / min"
                    },

                    beginAtZero: true

                }

            }

        }

    });

}


// =====================
// 瞬き間隔 CV
// =====================

export function drawIntervalCVChart(data){

    const ctx =
        document.getElementById(
            "intervalCVChart"
        );

    if(!ctx){
        return;
    }

    if(intervalCVChart){
        intervalCVChart.destroy();
    }

    intervalCVChart = new Chart(ctx, {

        type: "line",

        data: {

            labels:
                data.map(
                    p => p.time
                ),

            datasets: [{

                label: "Blink Interval CV",

                data:
                    data.map(
                        p => p.intervalCV * 100
                    ),

                tension: 0.2,

                pointRadius: 3,

                pointHoverRadius: 5

            }]

        },

        options: {

            ...chartOptions,

            scales: {

                x: {

                    title: {
                        display: true,
                        text: "Time (min)"
                    }

                },

                y: {

                    title: {
                        display: true,
                        text: "CV (%)"
                    },

                    beginAtZero: true

                }

            }

        }

    });

}


// =====================
// 平均瞬き時間
// =====================

export function drawDurationChart(data){

    const ctx =
        document.getElementById(
            "blinkDurationChart"
        );

    if(!ctx){
        return;
    }

    if(durationChart){
        durationChart.destroy();
    }

    durationChart = new Chart(ctx, {

        type: "line",

        data: {

            labels:
                data.map(
                    p => p.time
                ),

            datasets: [{

                label: "Average Blink Duration",

                data:
                    data.map(
                        p => p.avgBlinkDuration
                    ),

                tension: 0.2,

                pointRadius: 3,

                pointHoverRadius: 5

            }]

        },

        options: {

            ...chartOptions,

            scales: {

                x: {

                    title: {
                        display: true,
                        text: "Time (min)"
                    }

                },

                y: {

                    title: {
                        display: true,
                        text: "Duration (sec)"
                    },

                    beginAtZero: true

                }

            }

        }

    });

}


// =====================
// ストレススコア
// =====================

export function drawStressChart(data){

    const ctx =
        document.getElementById(
            "stressChart"
        );

    if(!ctx){
        return;
    }

    if(stressChart){
        stressChart.destroy();
    }

    stressChart = new Chart(ctx, {

        type: "line",

        data: {

            labels:
                data.map(
                    p => p.time
                ),

            datasets: [{

                label: "Stress Score",

                data:
                    data.map(
                        p => p.stressScore
                    ),

                tension: 0.2,

                pointRadius: 3,

                pointHoverRadius: 5

            }]

        },

        options: {

            ...chartOptions,

            scales: {

                x: {

                    title: {
                        display: true,
                        text: "Time (min)"
                    }

                },

                y: {

                    title: {
                        display: true,
                        text: "Stress Score"
                    }

                }

            }

        }

    });

}