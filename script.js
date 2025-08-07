// 페이지 로드 완료 후 로더 숨기기
window.addEventListener('load', () => {
    setTimeout(() => {
        document.getElementById('loader').classList.add('hidden');
    }, 1500);
});

// 1. 유성 효과 생성
function createMeteors() {
    const container = document.getElementById('meteorContainer');
    const meteorCount = 15;

    for (let i = 0; i < meteorCount; i++) {
        const meteor = document.createElement('div');
        meteor.classList.add('meteor');

        // 랜덤 위치
        const posX = Math.random() * 100;
        const posY = Math.random() * 50;
        meteor.style.left = `${posX}%`;
        meteor.style.top = `${posY}%`;

        // 랜덤 애니메이션 지연
        const delay = Math.random() * 10;
        meteor.style.animationDelay = `${delay}s`;

        // 랜덤 애니메이션 길이
        const duration = 3 + Math.random() * 5;
        meteor.style.animationDuration = `${duration}s`;

        container.appendChild(meteor);
    }
}

// 2. 파티클 시스템 생성
function createParticleSystem() {
    const container = document.getElementById('particleSystem');
    const particleCount = 100;
    const colors = [
        'rgba(138, 43, 226, 0.7)',
        'rgba(30, 144, 255, 0.7)',
        'rgba(255, 105, 180, 0.7)'
    ];

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');

        // 랜덤 크기
        const size = Math.random() * 8 + 2;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;

        // 랜덤 색상
        const color = colors[Math.floor(Math.random() * colors.length)];
        particle.style.backgroundColor = color;

        // 랜덤 위치
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        particle.style.left = `${posX}%`;
        particle.style.top = `${posY}%`;

        // 랜덤 애니메이션 지연
        const delay = Math.random() * 15;
        particle.style.animationDelay = `${delay}s`;

        // 랜덤 애니메이션 길이
        const duration = 10 + Math.random() * 20;
        particle.style.animationDuration = `${duration}s`;

        container.appendChild(particle);
    }
}

// 3. 움직이는 기하학적 형태 생성
function createGeometricShapes() {
    const container = document.getElementById('geometricShapes');
    const shapes = ['triangle', 'circle', 'square'];
    const shapeCount = 12;

    for (let i = 0; i < shapeCount; i++) {
        const shape = document.createElement('div');
        const shapeType = shapes[Math.floor(Math.random() * shapes.length)];
        shape.classList.add('shape', shapeType);

        // 랜덤 위치
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        shape.style.left = `${posX}%`;
        shape.style.top = `${posY}%`;

        // 랜덤 애니메이션 지연
        const delay = Math.random() * 10;
        shape.style.animationDelay = `${delay}s`;

        // 랜덤 애니메이션 길이
        const duration = 20 + Math.random() * 30;
        shape.style.animationDuration = `${duration}s`;

        container.appendChild(shape);
    }
}

// 4. 빛의 파동 효과 생성
function createLightWaves() {
    const container = document.getElementById('lightWaves');
    const waveCount = 5;

    for (let i = 0; i < waveCount; i++) {
        const wave = document.createElement('div');
        wave.classList.add('wave');

        // 랜덤 애니메이션 지연
        const delay = i * 4;
        wave.style.animationDelay = `${delay}s`;

        // 랜덤 애니메이션 길이
        const duration = 15 + Math.random() * 15;
        wave.style.animationDuration = `${duration}s`;

        container.appendChild(wave);
    }
}

// 5. 디지털 노이즈 효과 생성
function createDigitalNoise() {
    const canvas = document.getElementById('digitalNoise');
    const ctx = canvas.getContext('2d');

    // 캔버스 크기 설정
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // 노이즈 생성 함수
    function generateNoise() {
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const value = Math.random() > 0.5 ? 255 : 0;
            data[i] = value;     // R
            data[i + 1] = value; // G
            data[i + 2] = value; // B
            data[i + 3] = 255;   // A
        }

        ctx.putImageData(imageData, 0, 0);
    }

    // 노이즈 업데이트
    function updateNoise() {
        generateNoise();
        requestAnimationFrame(updateNoise);
    }

    updateNoise();

    // 창 크기 변경 시 캔버스 크기 조정
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// 9. 별빛 효과 생성
function createStarlight() {
    const container = document.getElementById('starlightContainer');
    const starCount = 100;

    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.classList.add('starlight');

        // 랜덤 위치
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        star.style.left = `${posX}%`;
        star.style.top = `${posY}%`;

        // 랜덤 크기
        const size = Math.random() * 3 + 1;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;

        // 랜덤 애니메이션 지연
        const delay = Math.random() * 4;
        star.style.animationDelay = `${delay}s`;

        container.appendChild(star);
    }
}

// 10. 빛줄기 효과 생성
function createLightRays() {
    const container = document.getElementById('lightRays');
    const rayCount = 12;

    for (let i = 0; i < rayCount; i++) {
        const ray = document.createElement('div');
        ray.classList.add('ray');

        // 각도 설정
        const angle = (360 / rayCount) * i;
        ray.style.transform = `rotate(${angle}deg)`;
        ray.style.left = '50%';
        ray.style.top = '0';

        // 랜덤 애니메이션 지연
        const delay = Math.random() * 5;
        ray.style.animationDelay = `${delay}s`;

        // 랜덤 애니메이션 길이
        const duration = 30 + Math.random() * 30;
        ray.style.animationDuration = `${duration}s`;

        container.appendChild(ray);
    }
}

// 마우스 상호작용 요소
function setupInteractiveElement() {
    const interactiveElement = document.getElementById('interactiveElement');

    document.addEventListener('mousemove', (e) => {
        const x = e.clientX;
        const y = e.clientY;

        interactiveElement.style.left = `${x - 150}px`;
        interactiveElement.style.top = `${y - 150}px`;
    });

    // 터치 디바이스 지원
    document.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            const x = e.touches[0].clientX;
            const y = e.touches[0].clientY;

            interactiveElement.style.left = `${x - 150}px`;
            interactiveElement.style.top = `${y - 150}px`;
        }
    });
}

// 스크롤 프로그레스 바
function setupScrollProgress() {
    const scrollProgress = document.getElementById('scrollProgress');

    window.addEventListener('scroll', () => {
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPosition = window.scrollY;
        const scrollPercentage = (scrollPosition / scrollHeight) * 100;

        scrollProgress.style.width = `${scrollPercentage}%`;
    });
}

// 부드러운 스크롤
function setupSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            const targetId = link.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });

                // 모바일 메뉴 닫기
                document.getElementById('navLinks').classList.remove('active');
            }
        });
    });
}

// 스크롤 시 요소 나타나기 효과
function setupScrollAnimations() {
    const galleryItems = document.querySelectorAll('.gallery-item');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    galleryItems.forEach((item, index) => {
        // 애니메이션 지연 설정
        item.style.transitionDelay = `${index * 0.1}s`;
        observer.observe(item);
    });
}

// 터치 피드백 효과
function setupTouchFeedback() {
    const buttons = document.querySelectorAll('.cta-button, .gallery-item');

    buttons.forEach(button => {
        button.addEventListener('click', function (e) {
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');

            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';

            this.appendChild(ripple);

            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

// 페이지 로드 시 초기화
window.addEventListener('DOMContentLoaded', () => {
    createMeteors();
    createParticleSystem();
    createGeometricShapes();
    createLightWaves();
    createDigitalNoise();
    createStarlight();
    createLightRays();
    setupInteractiveElement();
    setupScrollProgress();
    setupSmoothScroll();
    setupScrollAnimations();
    setupTouchFeedback();

    const currentYear = new Date().getFullYear();

    const copyrightYear = document.getElementById('copyright-year');

    copyrightYear.textContent = currentYear;
});