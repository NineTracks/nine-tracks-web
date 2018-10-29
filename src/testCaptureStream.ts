let isAudioSupportsStreamCapturing = false;

if (
    !isAudioSupportsStreamCapturing &&
    ("captureStream" in document.createElement("audio") ||
        "mozCaptureStream" in document.createElement("audio"))
) {
    isAudioSupportsStreamCapturing = true;
}

export { isAudioSupportsStreamCapturing };
