/**
 * ระบบจัดการข้อมูลผู้สมัคร (แก้ไขตรงนี้เพื่อเพิ่ม/ลดผู้สมัคร)
 */
const candidates = [
    { id: '1', name: 'ผู้สมัคร อุ๋งๆ', image: 'อุ๋งๆ.jpg' },
    { id: '2', name: 'ผู้สมัคร ตังทอง', image: 'ตังทอง.jpg' },
];

// สถานะแอปพลิเคชัน
let scores = {};
let voteChart = null;

// อ้างอิง DOM
const candidateGrid = document.getElementById('candidate-grid');
const loginForm = document.getElementById('login-form');
const adminPasswordInput = document.getElementById('admin-password');
const loginError = document.getElementById('login-error');
const voteStatus = document.getElementById('vote-status');
const scoreSummary = document.getElementById('score-summary');

/**
 * เริ่มต้นแอปพลิเคชัน
 */
function init() {
    loadScores();
    renderCandidates();
    setupAdminLogin();
}

/**
 * โหลดคะแนนจาก localStorage
 */
function loadScores() {
    const savedScores = localStorage.getItem('election_scores_2026');
    if (savedScores) {
        scores = JSON.parse(savedScores);
    } else {
        candidates.forEach(c => scores[c.id] = 0);
    }
    // ตรวจสอบว่าผู้สมัครใหม่ถูกเพิ่มเข้ามาใน config หรือไม่
    candidates.forEach(c => {
        if (scores[c.id] === undefined) scores[c.id] = 0;
    });
}

/**
 * บันทึกคะแนนลง localStorage
 */
function saveScores() {
    localStorage.setItem('election_scores_2026', JSON.stringify(scores));
}

/**
 * แสดงรายการผู้สมัครในหน้าแรก
 */
function renderCandidates() {
    candidateGrid.innerHTML = '';
    candidates.forEach(candidate => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="img-container">
                <img src="${candidate.image}" alt="${candidate.name}">
            </div>
            <div class="card-info">
                <h3>${candidate.name}</h3>
                <button onclick="vote('${candidate.id}')" class="btn-primary">ลงคะแนน</button>
            </div>
        `;
        candidateGrid.appendChild(card);
    });
}

/**
 * ฟังก์ชันลงคะแนน
 */
window.vote = function(id) {
    // โหลดคะแนนล่าสุดจาก storage ก่อนเพื่อป้องกันการทับซ้อนกันระหว่างหน้าต่าง
    loadScores();
    
    if (scores[id] === undefined) scores[id] = 0;
    scores[id]++;
    saveScores();
    
    const candidate = candidates.find(c => c.id === id);
    const candidateName = candidate ? candidate.name : id;
    voteStatus.innerText = `ขอบคุณที่ลงคะแนนให้ ${candidateName}!`;
    
    // เคลียร์ข้อความหลัง 3 วินาที
    setTimeout(() => { voteStatus.innerText = ''; }, 3000);
};

/**
 * การจัดการส่วนแสดงผล (Sections)
 */
window.showSection = function(sectionId) {
    const sections = ['vote-section', 'login-section', 'admin-section'];
    sections.forEach(id => {
        document.getElementById(id).style.display = (id === sectionId) ? 'block' : 'none';
    });

    if (sectionId === 'admin-section') {
        initChart();
        updateAdminUI();
    }
};

/**
 * ระบบล็อกอินแอดมิน
 */
function setupAdminLogin() {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const password = adminPasswordInput.value;
        
        // รหัสผ่านเริ่มต้นคือ 'admin'
        if (password === 'admin') {
            loginError.style.display = 'none';
            adminPasswordInput.value = '';
            showSection('admin-section');
        } else {
            loginError.style.display = 'block';
        }
    });
}

window.logout = function() {
    showSection('vote-section');
};

/**
 * จัดการแผนภูมิ (Chart.js)
 */
function initChart() {
    const ctx = document.getElementById('voteChart').getContext('2d');
    
    if (voteChart) {
        voteChart.destroy();
    }

    voteChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: candidates.map(c => c.name),
            datasets: [{
                label: 'คะแนนโหวต',
                data: candidates.map(c => scores[c.id]),
                backgroundColor: 'rgba(74, 105, 189, 0.7)',
                borderColor: 'rgba(74, 105, 189, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

/**
 * อัปเดตข้อมูลในหน้าแอดมิน
 */
function updateAdminUI() {
    // อัปเดตกราฟ
    if (voteChart) {
        voteChart.data.datasets[0].data = candidates.map(c => scores[c.id]);
        voteChart.update();
    }

    // อัปเดตตัวเลขสรุป
    scoreSummary.innerHTML = '';
    candidates.forEach(c => {
        const item = document.createElement('div');
        item.className = 'score-item';
        item.innerHTML = `
            <span class="score-name">${c.name}</span>
            <span class="score-value">${scores[c.id]}</span>
        `;
        scoreSummary.appendChild(item);
    });
}

/**
 * ฟังก์ชัน Refresh และ Reset
 */
window.refreshScores = function() {
    loadScores();
    updateAdminUI();
    // แสดง feedback เล็กน้อย
    const refreshBtn = document.querySelector('.btn-refresh');
    const originalText = refreshBtn.innerText;
    refreshBtn.innerText = 'อัปเดตแล้ว!';
    setTimeout(() => { refreshBtn.innerText = originalText; }, 1000);
};

window.resetScores = function() {
    if (confirm('คุณต้องการล้างคะแนนทั้งหมดใช่หรือไม่? (การกระทำนี้ไม่สามารถย้อนกลับได้)')) {
        scores = {}; // ล้างข้อมูลเก่าทั้งหมดทิ้ง
        candidates.forEach(c => scores[c.id] = 0);
        saveScores();
        updateAdminUI();
    }
};

// เริ่มทำงานเมื่อโหลดหน้าเสร็จ
window.onload = init;
