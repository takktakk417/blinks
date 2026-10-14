import {
    FaceLandmarker,
    FilesetResolver
} from "../assets/mediapipe/vision_bundle.mjs";

const BASE_PATH = "/blinks/";

export async function createFaceLandmarker() {
    const vision = await FilesetResolver.forVisionTasks(
        `${BASE_PATH}assets/mediapipe/wasm/`
    );

    return await FaceLandmarker.createFromOptions(
        vision,
        {
            baseOptions: {
                modelAssetPath:
                    `${BASE_PATH}assets/models/face_landmarker.task`
            },
            runningMode: "VIDEO",
            numFaces: 1
        }
    );
}