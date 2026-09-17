export function createSampleImageFile(
  label: string,
  color: string,
  subtext: string,
  filename: string
): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid pattern to simulate building surface
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Concrete/wall texture noise
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`;
      ctx.fillRect(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        Math.random() * 4 + 1,
        Math.random() * 4 + 1
      );
    }

    // Simulated crack or damage
    ctx.strokeStyle = 'rgba(20, 20, 20, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(200, 150);
    ctx.lineTo(240, 210);
    ctx.lineTo(220, 270);
    ctx.lineTo(280, 340);
    ctx.lineTo(310, 390);
    ctx.stroke();

    // Dark badge overlay
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.roundRect(40, 40, canvas.width - 80, 110, 12);
    ctx.fill();

    // Title label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(label, 60, 80);

    // Subtext
    ctx.fillStyle = '#94a3b8';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(subtext, 60, 115);

    // Timestamp stamp
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '13px monospace';
    ctx.fillText(`VISITE TECHNIQUE - ${new Date().toLocaleDateString('fr-FR')}`, 60, 440);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], filename, { type: 'image/jpeg' });
        resolve(file);
      }
    }, 'image/jpeg', 0.9);
  });
}
