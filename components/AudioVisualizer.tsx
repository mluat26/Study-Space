import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
    stream: MediaStream | null;
    isRecording: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ stream, isRecording }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    useEffect(() => {
        if (!stream || !isRecording || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Initialize Audio Context
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        const audioCtx = audioContextRef.current;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64; // Smaller FFT size for chunkier, distinct bars
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        sourceRef.current = source;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            const width = canvas.width;
            const height = canvas.height;

            animationRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, width, height);

            const barWidth = (width / bufferLength) * 0.6; // Bar width with spacing
            let x = (width - (bufferLength * (width / bufferLength) * 0.8)) / 2; // Center alignment roughly

            for (let i = 0; i < bufferLength; i++) {
                const value = dataArray[i];
                const percent = value / 255;
                const barHeight = Math.max(4, height * percent * 0.8); // Min height 4px
                
                // Draw symmetrical bar (centered vertically)
                const centerY = height / 2;
                
                // Light Blue Color (Sky-400)
                ctx.fillStyle = '#38bdf8'; // Tailwind sky-400
                
                // Rounded bar
                // We draw a rectangle centered vertically
                ctx.beginPath();
                ctx.roundRect(x, centerY - barHeight / 2, barWidth, barHeight, 4);
                ctx.fill();
                
                x += barWidth + 3; // Spacing
            }
        };

        draw();

        return () => {
            cancelAnimationFrame(animationRef.current);
            if (sourceRef.current) sourceRef.current.disconnect();
        };
    }, [stream, isRecording]);

    return (
        <canvas 
            ref={canvasRef} 
            width={240} 
            height={60} 
            className="w-full h-full"
        />
    );
};

export default AudioVisualizer;