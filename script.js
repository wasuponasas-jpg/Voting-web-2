/**
 * Firebase Configuration
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

// สถานะแอปพลิเคชัน
let candidates = [];
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
const adminCandidateList = document.getElementById('admin-candidate-list');

/**
 * เริ่มต้นแอปพลิเคชัน
 */
function init() {
    const checkFirebase = setInterval(() => {
        if (window.firebaseTools) {
            clearInterval(checkFirebase);
            setupFirebase();
        }
    }, 1000);
    setupAdminLogin();
}

/**
 * ตั้งค่าการเชื่อมต่อ Firebase
 */
function setupFirebase() {
    const { initializeApp, getDatabase, ref, onValue } = window.firebaseTools;
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);

    // ดึงข้อมูลผู้สมัคร
    const candidatesRef = ref(db, 'candidates');
    onValue(candidatesRef, (snapshot) => {
        const data = snapshot.val();
        candidates = data ? Object.values(data) : [];
        renderCandidates();
        if (document.getElementById('admin-section').style.display === 'block') {
            renderAdminCandidates();
        }
    });

    // ดึงข้อมูลคะแนน
    const scoresRef = ref(db, 'scores');
    onValue(scoresRef, (snapshot) => {
        scores = snapshot.val() || {};
        if (document.getElementById('admin-section').style.display === 'block') {
            updateAdminUI();
        }
    });
}

/**
 * ฟังก์ชันลงคะแนน
 */
window.vote = function(id) {
    if (!db) return;
    const { ref, runTransaction } = window.firebaseTools;
    const voteRef = ref(db, `scores/${id}`);

    runTransaction(voteRef, (currentValue) => {
        return (currentValue || 0) + 1;
    }).then(() => {
        const candidate = candidates.find(c => c.id === id);
        voteStatus.innerText = `ขอบคุณที่ลงคะแนนให้ ${candidate ? candidate.name : 'ผู้สมัคร'}!`;
        setTimeout(() => { voteStatus.innerText = ''; }, 3000);
    }).catch((err) => {
        console.error("Vote failed: ", err);
    });
};

/**
 * แสดงรายการผู้สมัครสำหรับผู้ใช้ทั่วไป
 */
function renderCandidates() {
    candidateGrid.innerHTML = '';
    if (candidates.length === 0) {
        candidateGrid.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">ยังไม่มีผู้สมัครในขณะนี้</p>';
        return;
    }
    candidates.forEach(candidate => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="img-container">
                <img src="${candidate.image}" alt="${candidate.name}" onerror="this.src='ตังทองมี coca.png'">
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
 * จัดการผู้สมัคร (เพิ่ม)
 */
window.addCandidate = function() {
    const nameInput = document.getElementById('new-candidate-name');
    const imageSelect = document.getElementById('new-candidate-image');
    
    if (!nameInput.value) return alert('กรุณากรอกชื่อผู้สมัคร');
    if (!imageSelect.value) return alert('กรุณาเลือกรูปภาพ');
    
    // เติมคำว่า "ผู้สมัคร " นำหน้าถ้ายังไม่มี
    let fullName = nameInput.value.trim();
    if (!fullName.startsWith('ผู้สมัคร')) {
        fullName = 'ผู้สมัคร ' + fullName;
    }

    const id = 'c' + Date.now();
    const newCandidate = {
        id: id,
        name: fullName,
        image: imageSelect.value
    };

    const { ref, set } = window.firebaseTools;
    set(ref(db, `candidates/${id}`), newCandidate)
        .then(() => {
            nameInput.value = '';
            imageSelect.value = '';
        })
        .catch(err => alert('Error: ' + err.message));
};

/**
 * จัดการผู้สมัคร (ลบ)
 */
window.deleteCandidate = function(id) {
    if (!confirm('ยืนยันการลบผู้สมัครรายนี้? (คะแนนจะยังคงอยู่ในระบบแต่จะไม่แสดงผล)')) return;
    
    const { ref, set } = window.firebaseTools;
    set(ref(db, `candidates/${id}`), null)
        .catch(err => alert('Error: ' + err.message));
};

/**
 * แสดงรายการผู้สมัครในหน้าแอดมิน
 */
function renderAdminCandidates() {
    adminCandidateList.innerHTML = '';
    candidates.forEach(c => {
        const item = document.createElement('div');
        item.className = 'admin-candidate-item';
        item.style = 'display:flex; justify-content:space-between; align-items:center; background:#eee; padding:10px; margin-bottom:10px; border-radius:12px; border: 1px solid #ddd;';
        item.innerHTML = `
            <div style="display:flex; align-items:center; gap:15px;">
                <img src="${c.image}" style="width:50px; height:50px; object-fit:cover; border-radius:50%;" onerror="this.src='ตังทองมี coca.png'">
                <div style="display:flex; flex-direction:column;">
                    <strong style="font-size:1.1rem;">${c.name}</strong>
                    <small style="color:#666;">ไฟล์: ${c.image}</small>
                </div>
            </div>
            <button onclick="deleteCandidate('${c.id}')" class="btn-danger" style="padding:8px 15px; font-size:0.9rem;">ลบผู้สมัคร</button>
        `;
        adminCandidateList.appendChild(item);
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
        renderAdminCandidates();
    }
};

/**
 * ระบบล็อกอินแอดมิน
 */
function setupAdminLogin() {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (adminPasswordInput.value === '07042558') {
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
 * จัดการแผนภูมิ
 */
function initChart() {
    const ctx = document.getElementById('voteChart').getContext('2d');
    if (voteChart) voteChart.destroy();

    voteChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: candidates.map(c => c.name),
            datasets: [{
                label: 'คะแนนโหวต',
                data: candidates.map(c => scores[c.id] || 0),
                backgroundColor: 'rgba(74, 105, 189, 0.7)',
                borderColor: 'rgba(74, 105, 189, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
            plugins: { legend: { display: false } }
        }
    });
}

/**
 * อัปเดตข้อมูลในหน้าแอดมิน
 */
function updateAdminUI() {
    if (voteChart) {
        voteChart.data.labels = candidates.map(c => c.name);
        voteChart.data.datasets[0].data = candidates.map(c => scores[c.id] || 0);
        voteChart.update();
    }

    scoreSummary.innerHTML = '';
    candidates.forEach(c => {
        const item = document.createElement('div');
        item.className = 'score-item';
        item.innerHTML = `
            <span class="score-name">${c.name}</span>
            <span class="score-value">${scores[c.id] || 0}</span>
        `;
        scoreSummary.appendChild(item);
    });
}

/**
 * รีเซ็ตคะแนน
 */
window.resetScores = function() {
    if (!confirm('คุณต้องการล้างคะแนนทั้งหมดใช่หรือไม่?')) return;
    const { ref, set } = window.firebaseTools;
    const resetData = {};
    candidates.forEach(c => resetData[c.id] = 0);
    set(ref(db, 'scores'), resetData).catch(err => alert(err.message));
};

window.refreshScores = () => updateAdminUI();
window.onload = init;
