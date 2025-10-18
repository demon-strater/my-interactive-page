document.addEventListener('DOMContentLoaded', () => {
    const pullChain = document.getElementById('pullChain');
    const nightScene = document.getElementById('nightScene');
    const body = document.body; // body 요소 참조
    let isNight = false;

    const clickSound = new Audio('music/swich.mp3');
    clickSound.volume = 0.5;

    // 초기 상태 설정 (아침이므로 끈은 검정색)
    pullChain.classList.add('black-cord');

    pullChain.addEventListener('click', () => {
        clickSound.currentTime = 0;
        clickSound.play().catch(e => console.error("Audio play failed:", e));

        isNight = !isNight;

        setTimeout(() => {
            if (isNight) {
                nightScene.style.opacity = 1;
                body.classList.add('night-background');
                pullChain.classList.remove('black-cord'); // 밤에는 끈을 흰색으로
            } else {
                nightScene.style.opacity = 0;
                body.classList.remove('night-background');
                pullChain.classList.add('black-cord'); // 낮에는 끈을 검정색으로
            }
        }, 500);

        pullChain.classList.add('pulled');
        setTimeout(() => {
            pullChain.classList.remove('pulled');
        }, 150);
    });
});
