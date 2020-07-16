const io = require('socket.io-client');

window.onload = () => {

    const socket = io('http://localhost:4003');

	let infoToSocket = { client: 'teste1', session: 'mySession' };

    socket.emit('init_socket', JSON.stringify(infoToSocket));

	const warningEl = document.getElementById('warning');
	const videoElement = document.getElementById('videoElement');
	const startBtn = document.getElementById('startBtn');
	const stopBtn = document.getElementById('stopBtn');
	const download = document.getElementById('download');

	const pauseBtn = document.getElementById('pauseBtn');
	const resumeBtn = document.getElementById('resumeBtn');
	
	// precisa estar habilitado: 
	// Enable chrome://flags/#enable-experimental-web-platform-features
	// para as features funcionarem
	if('getDisplayMedia' in navigator.mediaDevices) {
		//warningEl.style.display = 'none';
	}

	navigator.getUserMedia = (navigator.getUserMedia ||
								navigator.mozGetUserMedia ||
								navigator.msGetUserMedia ||
								navigator.webkitGetUserMedia);

	if (navigator.getUserMedia) {
		console.log('getUserMedia supported.');
	}

	let chunks;
	let blob;
	let mediaRecorder;
	let stream;
	let voiceStream;
	let desktopStream;

	let stateRecordNumber = 'record';
	
	// audio streams
	const mergeAudioStreams = (desktopStream, voiceStream) => {

		const context = new AudioContext();
		const destination = context.createMediaStreamDestination();

		let hasDesktop = false;
		let hasVoice = false;

		if (desktopStream && desktopStream.getAudioTracks().length > 0) {
			const source1 = context.createMediaStreamSource(desktopStream);
			const desktopGain = context.createGain();
			desktopGain.gain.value = 0.7;
			source1.connect(desktopGain).connect(destination);
			hasDesktop = true;
		}
		
		if (voiceStream && voiceStream.getAudioTracks().length > 0) {
			const source2 = context.createMediaStreamSource(voiceStream);
			const voiceGain = context.createGain();
			voiceGain.gain.value = 0.7;
			source2.connect(voiceGain).connect(destination);
			hasVoice = true;
		}
			
		return (hasDesktop || hasVoice) ? destination.stream.getAudioTracks() : [];
	};

	startBtn.onclick = async () => {

		socket.emit('create_file', Math.random().toString());

		download.style.display = 'none';
		desktopStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });

		// verificar se existe microfone para entrar no stream
		try{
			voiceStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });

		} catch(err) {
			console.log('Não foi detectado microfone. Verifique a entrada ou libere a permissão no browser');
		}
	
		const tracks = [
			...desktopStream.getVideoTracks(),
			...mergeAudioStreams(desktopStream, voiceStream)
		];

		stream = new MediaStream(tracks);

		videoElement.srcObject = stream;
		videoElement.muted = true;
			
		chunks = [];

		let mimeType = 'video/mp4';
		let extension = '.webm';
		let options = { mimeType: 'video/webm;codecs=h264' };
		let fallbackOptions = { mimeType: 'video/webm; codecs=vp8,opus' };
	
		// se codec não for aceito, tentar outro
		try {
			mediaRecorder = new MediaRecorder(stream, options);
		
		} catch(exception){
			mediaRecorder = new MediaRecorder(stream, fallbackOptions);
			mimeType = 'video/webm';
			extension = '.webm';
		}

		mediaRecorder.ondataavailable = (e) => {
			socket.emit('new_chunk_piece', e.data);
			chunks.push(e.data);
		}

		// quando parar o screenshare via browser, encerrar também a gravação
		desktopStream.getVideoTracks()[0].onended = function () {
			stopBtn.click();
		};



		mediaRecorder.onstop = async () => {
			//blob = new Blob(chunks, {type: mimeType});
			//let url = window.URL.createObjectURL(blob);
			//download.href = url;
			//download.download = `record_${Date.now().toString()}${extension}`;
			//download.style.display = 'block';


			
			desktopStream.getTracks().forEach(track => track.stop());

			//download.click();
		};

		mediaRecorder.start(2000);
		stopBtn.disabled = false;
		startBtn.disabled = true;
	};

	stopBtn.onclick = () => {
		startBtn.disabled = false;
		stopBtn.disabled = true;

		mediaRecorder.stop();
		
		stream.getTracks().forEach(s => { s.stop(); });
		videoElement.srcObject = null
		stream = null;
	};

	pauseBtn.onclick = () => {
		
		if (mediaRecorder.state === 'recording') {
			mediaRecorder.pause();
		}
	};

	resumeBtn.onclick = () => {
		if (mediaRecorder.state === 'paused') {
			mediaRecorder.resume();
		}
	}


};
