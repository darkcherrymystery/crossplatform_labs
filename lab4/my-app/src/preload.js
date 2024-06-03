const electron = require("electron");
const { ipcRenderer } = require('electron')
const { desktopCapturer } = require("electron");
const remote = require('@electron/remote');
const { Menu } = remote;
const { writeFile } = require("fs");
const { dialog } = remote;

ipcRenderer.on("videoPlayActivate", (event, data) => {

	  let status = 'stopped'
	  const playBtn = document.getElementById("playBtn");
	  const videoElementPlay = document.querySelector("video");

	  async function openVideo() {
	  	const {filePaths} = await dialog.showOpenDialog({properties:['openFile'], filters: [{name:"video", extensions: ["mp4", "webm", "avi"] }]});
	  	return filePaths
	  }

	  playBtn.onclick = e => {
		
	  	async function playVideo() {

	  		ipcRenderer.send("OpenVideoFile", null)
	  		filePath = await openVideo()
	  		
		  	videoSelectBtn.innerText = filePath;
		  	videoElementPlay.src = filePath;
		  
		  	videoElementPlay.play();
		  	status = 'playing'
			
		  	playBtn.classList.add("is-warning");
		  	playBtn.innerText = "Pause";

		}

		if (status == 'stopped') {playVideo()}
		else if (status == 'playing') {videoElementPlay.pause(); status = 'paused';playBtn.innerText = "Play";}
	    else if (status == 'paused') {videoElementPlay.play(); status = 'playing';playBtn.innerText = "Pause";}

	  };
});

ipcRenderer.on("videoSelectBtnActivate", (event, data) => {

	const videoSelectBtn = document.getElementById("videoSelectBtn");

	videoSelectBtn.onclick = function () {
	    ipcRenderer.send("videoSelectBtnActivate", null)
	}
});

ipcRenderer.on("videoSources", (event, data) => {

    console.log(data)

    const videoOptionsMenu = Menu.buildFromTemplate(

      data.map(source => {
        return {
          label: source.name,
          click: () => selectSource(source)
        };
      })
    );

    videoOptionsMenu.popup();

    let mediaRecorder;
	const recordedChunks = [];

    const videoElement = document.querySelector("video");
	// Change the videoSource window to record
	async function selectSource(source) {
	  videoSelectBtn.innerText = source.name;

	  const constraints = {
	    audio: false,
	    video: {
	      mandatory: {
	        chromeMediaSource: "desktop",
	        chromeMediaSourceId: source.id
	      }
	    }
	  };

	  // Create a Stream
	  const stream = await navigator.mediaDevices.getUserMedia(constraints);

	  // Preview the source in a video element
	  videoElement.srcObject = stream;
	  videoElement.play();

	  document.getElementById("playBtn").remove()

	  // Create the Media Recorder
	  const options = { mimeType: 'video/webm; codecs=vp9' };
	  mediaRecorder = new MediaRecorder(stream, options);

	  // Register Event Handlers
	  mediaRecorder.ondataavailable = handleDataAvailable;
	  mediaRecorder.onstop = handleStop;

	  const startBtn = document.getElementById("startBtn");
	  startBtn.onclick = e => {
	    mediaRecorder.start();
	    startBtn.classList.add("is-danger");
	    startBtn.innerText = "Recording";
	  };

	  const stopBtn = document.getElementById("stopBtn");
	  stopBtn.onclick = e => {
	    mediaRecorder.stop();
	    startBtn.classList.remove("is-danger");
	    startBtn.innerText = "Start";
	  };

	  // Captures all recorded chunks
	  function handleDataAvailable(e) {
	    console.log("Video recorded");
	    recordedChunks.push(e.data);
	  }

	  // Saves the video file on stop
	  async function handleStop(e) {
	    const blob = new Blob(recordedChunks, {
	      type: "video/webm; codecs=vp9"
	    });

	    const buffer = Buffer.from(await blob.arrayBuffer());

	    const { filePath } = await dialog.showSaveDialog({
	      buttonLabel: "Save video",
	      defaultPath: `vid-${Date.now()}.webm`
	    });

	    console.log(filePath);
	    writeFile(filePath, buffer, () => console.log("video saved successfully!"));

	  }
    }
});