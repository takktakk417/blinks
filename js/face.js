
import {
    FaceLandmarker,
    FilesetResolver
} from "../assets/mediapipe/vision_bundle.mjs";

export async function createFaceLandmarker() {
    const vision = await FilesetResolver.forVisionTasks(
        "./assets/mediapipe/wasm/"
    );

    return await FaceLandmarker.createFromOptions(
        vision,
        {
            baseOptions: {
                modelAssetPath:
                    "./assets/models/face_landmarker.task"
            },
            runningMode: "VIDEO",
            numFaces: 1
        }
    );
}