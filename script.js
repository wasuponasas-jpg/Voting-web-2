/**
 * Firebase Configuration
 * (ให้นำค่าที่คัดลอกจาก Firebase Console มาวางทับตรงนี้)
 */
const firebaseConfig = {
    apiKey: "AIzaSyBbSLmseNMO4U4fZFf_G6zi8J9XbugI2pE",
    authDomain: "voting-web67.firebaseapp.com",
    databaseURL: "https://voting-web67-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "voting-web6",
    storageBucket: "voting-web67.firebasestorage.app",
    messagingSenderId: "398836916975",
    appId: "1:398836916975:web:f8bdf99247ea635ef3b11a"
};

/**
 * ระบบจัดการข้อมูลผู้สมัคร
 */
const candidates = [
    { id: '1', name: 'ผู้สมัคร พ่อขุนรามคำแหงมหาราช', image: 'พ่อขุนรามคำแหงมหาราช.png' },
    { id: '2', name: 'ผู้สมัคร อนุทิน', image: 'อนุทิน.png' },
];

// สถานะแอปพลิเคชัน
let scores = {};
let voteChart = null;
let db = null;

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
    // รอจนกว่า Firebase SDK จะโหลดเสร็จ
    const checkFirebase = setInterval(() => {
        if (window.firebaseTools) {
            clearInterval(checkFirebase);
            setupFirebase();
        }
    }, 100);

    renderCandidates();
    setupAdminLogin();
}

/**
 * ตั้งค่าการเชื่อมต่อ Firebase
 */
function setupFirebase() {
    const { initializeApp, getDatabase, ref, onValue } = window.firebaseTools;
    
    // เริ่มต้น App
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);

    // สร้างการเชื่อมต่อแบบ Real-time (ข้อมูลจะอัปเดตเองเมื่อมีการโหวต)
    const scoresRef = ref(db, 'scores');
    onValue(scoresRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            scores = data;
        } else {
            // ถ้ายังไม่มีข้อมูลใน DB ให้ตั้งเป็น 0
            candidates.forEach(c => scores[c.id] = 0);
        }
        
        // อัปเดต UI เมื่อข้อมูลเปลี่ยน (สำหรับหน้าแอดมินที่เปิดทิ้งไว้)
        if (document.getElementById('admin-section').style.display === 'block') {
            updateAdminUI();
        }
    });
}

/**
 * ฟังก์ชันลงคะแนน (ใช้ Transaction เพื่อความแม่นยำ)
 */
window.vote = function(id) {
    if (!db) return;
    const { ref, runTransaction } = window.firebaseTools;
    const voteRef = ref(db, `scores/${id}`);

    runTransaction(voteRef, (currentValue) => {
        return (currentValue || 0) + 1;
    }).then(() => {
        const candidate = candidates.find(c => c.id === id);
        voteStatus.innerText = `ขอบคุณที่ลงคะแนนให้ ${candidate.name}! (ข้อมูลซิงค์แล้ว)`;
        setTimeout(() => { voteStatus.innerText = ''; }, 3000);
    }).catch((err) => {
        console.error("Vote failed: ", err);
        alert("เกิดข้อผิดพลาดในการส่งคะแนน โปรดตรวจสอบอินเทอร์เน็ต");
    });
};

/**
 * แสดงรายการผู้สมัคร
 */
function renderCandidates() {
    candidateGrid.innerHTML = '';
    candidates.forEach(candidate => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="img-container">
                <img src="${candidate.image}" alt="${candidate.name}" class="candidate-img-${candidate.id}">
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
        if (password === '07042558') {
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
    // ในระบบ Real-time ข้อมูลจะอัปเดตเองอยู่แล้ว
    // แต่เราใส่ฟังก์ชันนี้ไว้เพื่อให้แอดมินมั่นใจ
    updateAdminUI();
    
    const refreshBtn = document.querySelector('.btn-refresh');
    const originalText = refreshBtn.innerText;
    refreshBtn.innerText = 'อัปเดตแล้ว!';
    setTimeout(() => { refreshBtn.innerText = originalText; }, 1000);
};

window.resetScores = function() {
    if (confirm('คุณต้องการล้างคะแนนทั้งหมดใช่หรือไม่? (คะแนนในฐานข้อมูลจะกลายเป็น 0 ทั้งหมด)')) {
        if (!db) return;
        const { ref, set } = window.firebaseTools;
        const newScores = {};
        candidates.forEach(c => newScores[c.id] = 0);
        
        set(ref(db, 'scores'), newScores)
            .then(() => {
                alert('รีเซ็ตคะแนนเรียบร้อยแล้ว');
                updateAdminUI();
            })
            .catch(err => alert('เกิดข้อผิดพลาด: ' + err.message));
    }
};

// เริ่มทำงานเมื่อโหลดหน้าเสร็จ
window.onload = init;
