export function updateUI(
    infoDiv,
    stateDiv,
    data
){

    infoDiv.innerText =
`EAR : ${data.ear.toFixed(2)}

Base EAR : ${data.baselineEAR.toFixed(2)}

Total Blinks : ${data.total}

Average BPM : ${data.avg.toFixed(1)}

Last 1 min : ${data.recent}

Blink Interval CV : ${(data.blinkCV * 100).toFixed(1)} %

Blink Duration : ${data.blinkDuration.toFixed(2)} sec

Average BD: ${data.blinkDurationAvg.toFixed(2)} sec

BD Deviation : ${(data.blinkDurationDeviation * 100).toFixed(1)} %

Elapsed : ${data.elapsed.toFixed(1)} sec`;

    stateDiv.innerText =
        data.stateText;

    stateDiv.className =
        data.stateClass;
}