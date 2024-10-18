<template>
  <div>
    <svg version="1.1" id="question_x5F_answer" xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink" width="100%" height="100%" viewBox="0 0 400 400"
      @click="startAnimation" ref="mySvg">
      <path id="target" :d="myPath"></path>
    </svg>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { interpolate } from "flubber";

const myPath = ref();
const mySvg = ref();

const ikaPath = 'M 113.766 103.798 C 110.656 112.08 115.893 137.306 107.447 136.048 C 88.481 133.223 57.276 117.742 34.339 114.161 C 20.682 112.03 1.605 112.314 1.013 126.001 C 0.000 149.434 19.722 146.979 19.364 161.124 C 19.084 172.15 0.362 177.179 0.565 188.206 C 0.791 200.562 21.537 207.507 21.081 219.856 C 20.616 232.456 1.435 238.919 1.235 251.527 C 1.062 262.404 19.611 266.653 20.166 277.517 C 20.913 292.127 2.266 285.486 1.011 312.002 C 0.411 324.66 17.400 327.007 25.364 326.815 C 51.907 326.177 76.606 319.507 106.063 307.622 C 114.192 304.343 111.045 333.766 113.766 342.4 C 115.822 348.923 116.520 357.467 122.134 361.057 C 127.417 364.435 135.684 363.439 140.677 359.611 C 185.697 325.102 228.863 287.788 269.658 247.977 C 276.041 241.749 280.559 232.222 280.559 223.107 C 280.559 213.988 276.045 204.453 269.658 198.221 C 228.865 158.418 185.694 121.121 140.677 86.62 C 135.683 82.792 127.420 81.783 122.134 85.157 C 116.521 88.74 116.165 97.41 113.766 103.798 Z';
// const rectPath = `M 22.597 0 L 257.403 0 C 269.884 0 280 8.144 280 18.192 L 280 81.808 C 280 91.856 269.884 100 257.403 100 L 22.597 100 C 10.116 100 0 91.856 0 81.808 L 0 18.192 C 0 8.144 10.116 0 22.597 0 Z`;
const trialePath = 'M 3.315 103.799 C 0.000 112.082 0.417 333.764 3.315 342.398 C 5.503 348.921 6.247 357.465 12.227 361.056 C 17.854 364.433 26.661 363.437 31.978 359.609 C 79.937 325.1 125.914 287.786 169.372 247.977 C 176.172 241.749 180.982 232.221 180.982 223.107 C 180.982 213.987 176.176 204.453 169.372 198.221 C 125.917 158.419 79.932 121.122 31.978 86.622 C 26.659 82.794 17.857 81.785 12.227 85.159 C 6.249 88.741 5.869 97.411 3.315 103.799 Z';

// const interpolator1 = interpolate(rectPath, trialePath);
const interpolator2 = interpolate(trialePath, ikaPath);
const interpolator3 = interpolate(ikaPath, trialePath);

onMounted(() => {
  myPath.value = trialePath;
});

function translateAnim(v) {
  let startX = 0; // 初期位置
  let startY = 0; // 固定のY位置
  let endX = window.innerWidth - 100; // 右端の位置を計算 (調整が必要かもしれません)
  let currentX = startX + (endX - startX) * v;

  // SVGの位置を更新
  console.log(mySvg);
  mySvg.value.style.transform = `translate(${currentX}px, ${startY}px)`;
}

async function startAnimation() {
  // await animate(v => myPath.value = interpolator1(v), 400);
  await animate(v => myPath.value = interpolator2(v), 600);
  await animate(translateAnim, 1000);
  await animate(v => myPath.value = interpolator3(v), 1000);

}

// animは0～1で進行率を受け取る
function animate(anim, duration) {
  const startTime = performance.now();
  let animationFrameId = 0;
  return new Promise((resolve) => {
    function step() {
      const elapsedTime = performance.now() - startTime;

      if (elapsedTime < duration) {
        // 実行したいメソッドの処理
        anim(elapsedTime / duration);
        // 次のフレームをリクエスト
        animationFrameId = requestAnimationFrame(step);
      } else {
        // アニメーションの終了
        anim(1);
        cancelAnimationFrame(animationFrameId);
        resolve(); // アニメーションが終了したら Promise を解決する
      }
    }
    animationFrameId = requestAnimationFrame(step);
  });
}

</script>

<style>
button {
  background-color: cadetblue;
  position: absolute;
  z-index: 1000;
}

.ikasvg {
  width: 100%;
  height: 100%;
}

#target {
  fill: dodgerblue;
}
</style>
