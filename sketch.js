let capture;
let faceMesh;
let handPose;
let faces = [];
let hands = [];
let earringImages = [];
let currentEarringIndex = 0; // 預設顯示第一款耳環

function preload() {
  // 載入 ml5.js 的 FaceMesh 模型
  faceMesh = ml5.faceMesh();
  // 載入 ml5.js 的 HandPose 模型
  handPose = ml5.handPose();

  // 載入 5 張耳環圖片
  for (let i = 1; i <= 5; i++) {
    // 根據需求載入圖片，特別注意第二款檔名為 acc2_ringl.png
    let fileName = `pic/acc${i}_ring.png`;
    if (i === 2) {
      fileName = `pic/acc2_ringl.png`;
    }
    earringImages.push(loadImage(fileName));
  }
}

function gotFaces(results) {
  // 更新偵測到的臉部特徵
  faces = results;
}

function gotHands(results) {
  // 更新偵測到的手部特徵
  hands = results;
}

function setup() {
  // 建立全螢幕畫布
  createCanvas(windowWidth, windowHeight);

  // 擷取攝影機影像
  capture = createCapture(VIDEO);
  // 隱藏預設在畫布下方的 HTML 影片元件
  capture.hide();

  // 確保攝影機載入後才開始偵測
  // 使用 detectStart 持續偵測
  if (faceMesh) {
    faceMesh.detectStart(capture, gotFaces);
  }
  // 開始手勢偵測
  if (handPose) {
    handPose.detectStart(capture, gotHands);
  }
}

function draw() {
  // 設定背景顏色為 e7c6ff
  background('#e7c6ff');

  // 計算影像顯示的寬高（全螢幕寬高的 50%）
  let vidW = width * 0.5;
  let vidH = height * 0.5;

  // 處理手勢辨識切換耳環
  if (hands && hands.length > 0) {
    let count = countFingers(hands[0]);
    // 如果偵測到 1-5 根手指，則更換耳環索引
    if (count >= 1 && count <= 5) {
      let newIndex = count - 1;
      // 安全檢查：確保圖片已成功載入且寬度大於 1（表示圖片有效）
      if (earringImages[newIndex] && earringImages[newIndex].width > 1) {
        currentEarringIndex = newIndex;
      }
    }
  }

  push();

  // 將原點移動到畫布中心
  translate(width / 2, height / 2);

  // 執行水平翻轉（左右顛倒）
  scale(-1, 1);

  // 設定影像繪製模式為中心
  imageMode(CENTER);

  // 如果攝影機已準備好，才顯示影像
  if (capture.width > 0) {
    image(capture, 0, 0, vidW, vidH);
  }

  // 如果有偵測到臉部，則繪製耳垂點
  if (faces && faces.length > 0 && capture.width > 0 && earringImages.length > 0) {
    let face = faces[0];
    // 234 與 454 是 FaceMesh 中臉部兩側最靠近耳朵邊緣的點
    // 132 與 361 也是不錯的選擇
    let earPoints = [face.keypoints[132], face.keypoints[361]];
    
    earPoints.forEach(p => {
      // 將偵測點從「攝影機解析度」映射到「畫布上的顯示大小」
      // 由於已經 translate 到中心且做了鏡像，映射範圍是 -vidW/2 到 vidW/2
      let mappedX = map(p.x, 0, capture.width, -vidW / 2, vidW / 2);
      let mappedY = map(p.y, 0, capture.height, -vidH / 2, vidH / 2);
      
      // 繪製對應的手勢耳環 (設定寬高為 40, 可依需求調整)
      if (earringImages[currentEarringIndex]) {
        image(earringImages[currentEarringIndex], mappedX, mappedY, 40, 40);
      }
    });
  }

  pop();
}

// 當視窗大小改變時，自動調整畫布大小
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// 計算伸出的手指數量（簡易判斷）
function countFingers(hand) {
  let count = 0;
  // 檢查食指、中指、無名指、小指 (keypoints 8, 12, 16, 20)
  // 如果指尖的 Y 座標小於關節的 Y 座標，代表手指伸直
  let fingerTips = [8, 12, 16, 20];
  let fingerJoints = [6, 10, 14, 18];

  if (hand && hand.keypoints) {
    for (let i = 0; i < 4; i++) {
      // 判斷指尖是否高於關節（y 座標越小越高）
      if (hand.keypoints[fingerTips[i]].y < hand.keypoints[fingerJoints[i]].y) {
        count++;
      }
    }

    // 大拇指的改良判斷：判斷拇指尖(4)與小指根部(17)的水平距離，避開鏡像干擾
    if (hand.keypoints[4] && hand.keypoints[17]) {
      let thumbDist = dist(hand.keypoints[4].x, hand.keypoints[4].y, hand.keypoints[17].x, hand.keypoints[17].y);
      // 拇指張開的距離通常會比手掌寬度的一半大
      let palmSize = dist(hand.keypoints[5].x, hand.keypoints[5].y, hand.keypoints[17].x, hand.keypoints[17].y);
      if (thumbDist > palmSize * 1.2) count++;
    }
  }

  return count;
}
