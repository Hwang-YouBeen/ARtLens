export type RefDesc = {
    tpl: any; // cv.Mat (grayscale template)
    w: number;
    h: number;
    url: string;
  };
  
  export async function waitCv(timeoutMs = 15000) {
    // 이미 준비됨
    if ((window as any).cv && typeof (window as any).cv.Mat === "function") return;
  
    // onRuntimeInitialized 경로
    if ((window as any).cv && "onRuntimeInitialized" in (window as any).cv) {
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("OpenCV init timeout")), timeoutMs);
        (window as any).cv.onRuntimeInitialized = () => {
          clearTimeout(t);
          resolve();
        };
      });
      return;
    }
  
    // 폴링
    await new Promise<void>((resolve, reject) => {
      const start = performance.now();
      (function tick() {
        if ((window as any).cv && typeof (window as any).cv.Mat === "function") return resolve();
        if (performance.now() - start > timeoutMs) return reject(new Error("OpenCV load timeout"));
        setTimeout(tick, 50);
      })();
    });
  }
  
  function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((res, rej) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => res(img);
      img.onerror = (e) => rej(e);
      img.src = url;
    });
  }
  
  export async function buildRefDescriptor(url: string): Promise<RefDesc> {
    await waitCv();
    const cv: any = (window as any).cv;
  
    const imgEl = await loadImage(url);
    const rgba = cv.imread(imgEl); // RGBA
    const gray = new cv.Mat();
    cv.cvtColor(rgba, gray, cv.COLOR_RGBA2GRAY);
    rgba.delete();
  
    return {
      tpl: gray,
      w: imgEl.naturalWidth || imgEl.width,
      h: imgEl.naturalHeight || imgEl.height,
      url,
    };
  }
  
  /**
   * 멀티스케일 템플릿 매칭
   * - frameCanvas: 현재 프레임이 그려진 <canvas>
   * - ref: buildRefDescriptor 결과
   * - threshold: 매칭 임계(0~1)
   */
  export async function matchAndLocate(
    frameCanvas: HTMLCanvasElement,
    ref: RefDesc,
    threshold = 0.58
  ): Promise<{ ok: boolean; rect: { x: number; y: number; w: number; h: number } | null; score: number }> {
    await waitCv();
    const cv: any = (window as any).cv;
  
    const src = cv.imread(frameCanvas); // RGBA
    const srcGray = new cv.Mat();
    cv.cvtColor(src, srcGray, cv.COLOR_RGBA2GRAY);
  
    let best = { ok: false, rect: null as any, score: -1 };
  
    // 큰 참조 이미지는 프레임보다 클 수 있으므로 스케일 다운하며 탐색
    const scales = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.45, 0.4, 0.35, 0.3];
  
    const tplGrayOriginal: any = ref.tpl; // cv.Mat(gray)
  
    const resized = new cv.Mat();
    const result = new cv.Mat();
  
    for (const s of scales) {
      const tw = Math.max(8, Math.round(tplGrayOriginal.cols * s));
      const th = Math.max(8, Math.round(tplGrayOriginal.rows * s));
  
      if (tw >= srcGray.cols || th >= srcGray.rows) continue;
  
      cv.resize(tplGrayOriginal, resized, new cv.Size(tw, th), 0, 0, cv.INTER_AREA);
  
      const resultW = srcGray.cols - resized.cols + 1;
      const resultH = srcGray.rows - resized.rows + 1;
      if (resultW <= 0 || resultH <= 0) continue;
  
      result.create(resultH, resultW, cv.CV_32FC1);
      cv.matchTemplate(srcGray, resized, result, cv.TM_CCOEFF_NORMED);
  
      const minMax = cv.minMaxLoc(result);
      const maxVal = minMax.maxVal as number;
      const maxLoc = minMax.maxLoc as { x: number; y: number };
  
      if (maxVal > best.score) {
        best = {
          ok: maxVal >= threshold,
          rect: { x: maxLoc.x, y: maxLoc.y, w: resized.cols, h: resized.rows },
          score: maxVal,
        };
      }
    }
  
    // cleanup
    src.delete();
    srcGray.delete();
    resized.delete();
    result.delete();
  
    if (best.ok) return best;
    return { ok: false, rect: null, score: best.score };
  }