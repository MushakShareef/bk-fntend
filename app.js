// ====== CONFIG ======
const API_BASE = "https://bk-spiritual-backend.onrender.com"; // <-- change this to your Render backend URL

// ====== GLOBAL STATE ======
let points = [];
let currentAdmin = null;
let currentMember = null;
let publicSelectedMemberId = null;

// ====== UTILITIES ======
function showView(id) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  const el = document.getElementById(`view-${id}`) || document.getElementById(id);
  if (el) el.classList.add("active");
}

function showToast(message, { error = false } = {}) {
  const t = document.getElementById("toast");
  t.textContent = message;
  t.classList.remove("hidden", "error");
  if (error) t.classList.add("error");

  setTimeout(() => {
    t.classList.add("hidden");
  }, 2800);
}

async function api(path, options = {}) {
  const opts = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include",
    ...options,
  };
  if (options.body && typeof options.body !== "string") {
    opts.body = JSON.stringify(options.body);
  }
  const res = await fetch(`${API_BASE}${path}`, opts);
  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    // ignore
  }
  if (!res.ok) {
    const msg = (data && data.message) || `Error ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

function setTodayToDateInput(id) {
  const inp = document.getElementById(id);
  if (!inp) return;
  const d = new Date();
  const pad = (n) => (n < 10 ? "0" + n : n);
  const s = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  inp.value = s;
}

// ====== VIEWS NAVIGATION SETUP ======
function setupNavigation() {
  // From landing
  document
    .getElementById("logo-touch")
    .addEventListener("click", () => showView("admin-login"));

  document
    .getElementById("btn-student-login-landing")
    .addEventListener("click", () => showView("student-login"));

  document
    .getElementById("btn-student-register-landing")
    .addEventListener("click", () => showView("student-register"));

  // document
  //   .getElementById("btn-public-charts-landing")
  //   .addEventListener("click", () => {
  //     showView("public-charts");
  //     loadPublicMembers();
  //   });

  // Generic nav buttons
  document.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-nav");
      showView(target);
      if (target === "public-charts") {
        loadPublicMembers();
      }
    });
  });
}

// ====== SHOW / HIDE PASSWORD ======
function setupPasswordToggles() {
  document.querySelectorAll(".show-password-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const input = document.getElementById(targetId);
      if (!input) return;
      if (input.type === "password") {
        input.type = "text";
        btn.textContent = "Hide";
      } else {
        input.type = "password";
        btn.textContent = "Show";
      }
    });
  });
}

// ====== ADMIN LOGIN ======
function setupAdminLogin() {
  const form = document.getElementById("admin-login-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("admin-username").value.trim();
    const password = document.getElementById("admin-password").value.trim();
    if (!username || !password) {
      showToast("Please fill both fields.", { error: true });
      return;
    }
    try {
      const data = await api("/api/admin/login", {
        method: "POST",
        body: { username, password },
      });
      currentAdmin = data.admin;
      localStorage.setItem("admin", JSON.stringify(currentAdmin));
      document.getElementById("admin-username-display").textContent =
        currentAdmin.username;
      await refreshAdminData();
      showView("admin-dashboard");
      showToast("Admin login successful.");
    } catch (err) {
      showToast(err.message || "Admin login failed.", { error: true });
    }
  });

  document
    .getElementById("admin-logout-btn")
    .addEventListener("click", () => {
      currentAdmin = null;
      localStorage.removeItem("admin");
      showToast("Admin logged out.");
      showView("landing");
    });
}

// ====== STUDENT LOGIN / REGISTER ======
function setupStudentAuth() {
  // Login
  const loginForm = document.getElementById("student-login-form");
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const mobile = document
      .getElementById("student-mobile-login")
      .value.trim();
    const password = document
      .getElementById("student-password-login")
      .value.trim();
    if (!mobile || !password) {
      showToast("Please fill both fields.", { error: true });
      return;
    }
    try {
      const data = await api("/api/members/login", {
        method: "POST",
        body: { mobile, password },
      });
      currentMember = data.member;
      localStorage.setItem("member", JSON.stringify(currentMember));
      await loadPointsIfNeeded();
      setupStudentDashboardAfterLogin();
      showView("student-dashboard");
      showToast("Login successful.");
    } catch (err) {
      showToast(err.message || "Login failed.", { error: true });
    }
  });

  // Registration
  const regForm = document.getElementById("student-register-form");
  regForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("student-name").value.trim();
    const centre = document.getElementById("student-centre").value.trim();
    const mobile = document.getElementById("student-mobile").value.trim();
    const password = document.getElementById("student-password").value.trim();
    const confirm = document
      .getElementById("student-password-confirm")
      .value.trim();

    if (!name || !centre || !mobile || !password || !confirm) {
      showToast("Please fill all fields.", { error: true });
      return;
    }
    if (password !== confirm) {
      showToast("Passwords do not match.", { error: true });
      return;
    }

    try {
      await api("/api/members/register", {
        method: "POST",
        body: { name, centre, mobile, password },
      });
      showToast("Registration successful. Please login.");
      showView("student-login");
    } catch (err) {
      showToast(err.message || "Registration error.", { error: true });
    }
  });

  // Logout
  document
    .getElementById("student-logout-btn")
    .addEventListener("click", () => {
      currentMember = null;
      localStorage.removeItem("member");
      showToast("Logged out.");
      showView("landing");
    });
}

// ====== LOAD POINTS ======
async function loadPointsIfNeeded() {
  if (points.length > 0) return;
  try {
    const data = await api("/api/debug/points");
    points = data.points || [];
  } catch (err) {
    console.error(err);
    showToast("Unable to load points.", { error: true });
  }
}

// ====== ADMIN: MANAGE POINTS ======
function setupAdminPointsUI() {
  document
    .getElementById("add-point-btn")
    .addEventListener("click", async () => {
      const input = document.getElementById("new-point-text");
      const text = input.value.trim();
      if (!text) {
        showToast("Point text is empty.", { error: true });
        return;
      }
      try {
        const res = await api("/api/admin/points", {
          method: "POST",
          body: { text },
        });
        points.push(res.point);
        renderAdminPoints();
        input.value = "";
        showToast("Point added.");
      } catch (err) {
        showToast(err.message || "Error adding point.", { error: true });
      }
    });
}

function renderAdminPoints() {
  const container = document.getElementById("points-list");
  container.innerHTML = "";
  if (!points || points.length === 0) {
    container.textContent = "No points defined.";
    return;
  }

  points.forEach((p) => {
    const row = document.createElement("div");
    row.className = "point-row";

    const textarea = document.createElement("textarea");
    textarea.value = p.text;
    textarea.dataset.pointId = p.id;

    const actions = document.createElement("div");
    actions.className = "point-actions";

    const btnSave = document.createElement("button");
    btnSave.className = "btn-icon";
    btnSave.textContent = "Save";
    btnSave.addEventListener("click", async () => {
      const newText = textarea.value.trim();
      if (!newText) {
        showToast("Point cannot be empty.", { error: true });
        return;
      }
      try {
        await api(`/api/admin/points/${p.id}`, {
          method: "PUT",
          body: { text: newText },
        });
        p.text = newText;
        showToast("Point updated.");
      } catch (err) {
        showToast(err.message || "Error updating.", { error: true });
      }
    });

    const btnDelete = document.createElement("button");
    btnDelete.className = "btn-icon danger";
    btnDelete.textContent = "Del";
    btnDelete.addEventListener("click", async () => {
      if (!confirm("Delete this point?")) return;
      try {
        await api(`/api/admin/points/${p.id}`, { method: "DELETE" });
        points = points.filter((pt) => pt.id !== p.id);
        renderAdminPoints();
        showToast("Point deleted.");
      } catch (err) {
        showToast(err.message || "Error deleting.", { error: true });
      }
    });

    actions.appendChild(btnSave);
    actions.appendChild(btnDelete);
    row.appendChild(textarea);
    row.appendChild(actions);
    container.appendChild(row);
  });
}

// ====== ADMIN: MEMBERS LIST ======
async function loadMembersList() {
  try {
    const data = await api("/api/admin/all-members");
    const members = data.members || [];
    const container = document.getElementById("members-list");
    if (members.length === 0) {
      container.textContent = "No students registered yet.";
      return;
    }
    const table = document.createElement("table");
    table.className = "members-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Name</th>
          <th>Centre</th>
          <th>Mobile</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");

    members.forEach((m) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${m.name || "-"}</td>
        <td>${m.centre || "-"}</td>
        <td>${m.mobile}</td>
        <td></td>
      `;
      const actionsCell = tr.querySelector("td:last-child");

      const viewBtn = document.createElement("button");
      viewBtn.className = "btn-icon";
      viewBtn.textContent = "Chart";
      viewBtn.addEventListener("click", () => {
        // re-use public wrapper for admin view
        const wrapper = document.getElementById("admin-public-wrapper");
        wrapper.innerHTML = "";
        const title = document.createElement("h4");
        title.textContent = `Chart: ${m.name || ""} (${m.centre || ""})`;
        wrapper.appendChild(title);

        const periodRow = document.createElement("div");
        periodRow.className = "period-switch";
        ["daily", "weekly", "monthly", "yearly"].forEach((period, idx) => {
          const chip = document.createElement("button");
          chip.className = "chip" + (idx === 0 ? " active" : "");
          chip.textContent = period[0].toUpperCase() + period.slice(1);
          chip.addEventListener("click", () => {
            periodRow.querySelectorAll(".chip").forEach((c) =>
              c.classList.remove("active")
            );
            chip.classList.add("active");
            loadMemberProgress(period, m.id, wrapperProgress);
          });
          periodRow.appendChild(chip);
        });
        wrapper.appendChild(periodRow);

        const wrapperProgress = document.createElement("div");
        wrapper.appendChild(wrapperProgress);

        loadMemberProgress("daily", m.id, wrapperProgress);
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn-icon danger";
      deleteBtn.textContent = "Del";
      deleteBtn.addEventListener("click", async () => {
        if (!confirm("Delete this student and their chart?")) return;
        try {
          await api(`/api/admin/delete-member/${m.id}`, {
            method: "DELETE",
          });
          showToast("Student deleted.");
          loadMembersList();
        } catch (err) {
          showToast(err.message || "Error deleting student.", { error: true });
        }
      });

      actionsCell.appendChild(viewBtn);
      actionsCell.appendChild(deleteBtn);
      tbody.appendChild(tr);
    });

    container.innerHTML = "";
    container.appendChild(table);
  } catch (err) {
    showToast(err.message || "Error loading members.", { error: true });
  }
}

// ====== PUBLIC MEMBERS LIST (EVERYONE) ======
async function loadPublicMembers() {
  try {
    const data = await api("/api/members");
    const members = data.members || [];
    const list = document.getElementById("public-members-list");
    if (members.length === 0) {
      list.textContent = "No students registered yet.";
      return;
    }
    list.innerHTML = "";
    members.forEach((m) => {
      const row = document.createElement("div");
      row.className = "public-member-row";
      const left = document.createElement("div");
      left.innerHTML = `<strong>${m.name || "-"}</strong><br/><span class="small-text">${m.centre || "-"}</span>`;
      const btn = document.createElement("button");
      btn.className = "btn-icon";
      btn.textContent = "View";
      btn.addEventListener("click", () => {
        publicSelectedMemberId = m.id;
        document
          .getElementById("public-selected-title")
          .classList.remove("hidden");
        document.getElementById(
          "public-selected-title"
        ).textContent = `Chart: ${m.name || ""} (${m.centre || ""})`;
        // Reset chips
        document
          .querySelectorAll("#public-period-switch .chip")
          .forEach((c, idx) => {
            if (idx === 0) c.classList.add("active");
            else c.classList.remove("active");
          });
        loadMemberProgress("daily", m.id, document.getElementById("public-progress-list"));
      });
      row.appendChild(left);
      row.appendChild(btn);
      list.appendChild(row);
    });
  } catch (err) {
    showToast(err.message || "Error loading public list.", { error: true });
  }
}

function setupPublicPeriodSwitch() {
  document
    .querySelectorAll("#public-period-switch .chip")
    .forEach((chip) => {
      chip.addEventListener("click", () => {
        if (!publicSelectedMemberId) return;
        const period = chip.getAttribute("data-public-period");
        document
          .querySelectorAll("#public-period-switch .chip")
          .forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        loadMemberProgress(
          period,
          publicSelectedMemberId,
          document.getElementById("public-progress-list")
        );
      });
    });
}

// ====== PROGRESS RENDERING ======
async function loadMemberProgress(period, memberId, container) {
  if (!memberId) return;
  try {
    await loadPointsIfNeeded();
    const data = await api(
      `/api/members/${memberId}/progress/${period || "daily"}`
    );
    renderProgressList(data.progress || [], container);
  } catch (err) {
    container.innerHTML = `<p class="small-text">Error loading progress.</p>`;
  }
}

function renderProgressList(progress, container) {
  container.innerHTML = "";
  if (!progress || progress.length === 0) {
    container.innerHTML = `<p class="small-text">No data yet.</p>`;
    return;
  }
  progress.forEach((p) => {
    const item = document.createElement("div");
    item.className = "progress-item";

    const header = document.createElement("div");
    header.className = "progress-header";
    header.innerHTML = `<span>${p.text}</span><span>${Math.round(
      p.percentage || 0
    )}%</span>`;

    const bar = document.createElement("div");
    bar.className = "progress-bar";
    const fill = document.createElement("div");
    fill.className = "progress-bar-fill";
    fill.style.width = `${Math.max(0, Math.min(100, p.percentage || 0))}%`;
    bar.appendChild(fill);

    item.appendChild(header);
    item.appendChild(bar);
    container.appendChild(item);
  });
}

// ====== STUDENT DASHBOARD AFTER LOGIN ======
function setupStudentDashboardAfterLogin() {
  const welcome = document.getElementById("student-welcome");
  welcome.textContent = `Om Shanti, ${
    currentMember.name || "Student"
  } | Centre: ${currentMember.centre || "-"}`;

  setTodayToDateInput("daily-date");
  renderStudentPointsSliders();
  loadStudentDay();
  loadStudentAverages("daily");
}

function renderStudentPointsSliders() {
  const container = document.getElementById("student-points-input");
  container.innerHTML = "";
  if (!points || points.length === 0) {
    container.textContent = "No points available.";
    return;
  }

  points.forEach((p) => {
    const row = document.createElement("div");
    row.className = "point-input-row";

    const label = document.createElement("div");
    label.className = "point-label";
    label.textContent = p.text;

    const sliderRow = document.createElement("div");
    sliderRow.className = "slider-row";

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = "100";
    slider.value = "0";
    slider.dataset.pointId = p.id;

    const valueSpan = document.createElement("span");
    valueSpan.className = "slider-value";
    valueSpan.textContent = "0%";

    slider.addEventListener("input", () => {
      valueSpan.textContent = `${slider.value}%`;
    });

    sliderRow.appendChild(slider);
    sliderRow.appendChild(valueSpan);
    row.appendChild(label);
    row.appendChild(sliderRow);
    container.appendChild(row);
  });
}

async function loadStudentDay() {
  const date = document.getElementById("daily-date").value;
  if (!currentMember || !date) return;
  await loadPointsIfNeeded();
  try {
    const data = await api(
      `/api/members/${currentMember.id}/daily/${date}`
    );
    // data is map {pointId: effort}
    document
      .querySelectorAll("#student-points-input input[type='range']")
      .forEach((slider) => {
        const pid = slider.dataset.pointId;
        const effort = data[pid] || 0;
        slider.value = effort;
        const valueSpan = slider.parentElement.querySelector(".slider-value");
        if (valueSpan) valueSpan.textContent = `${effort}%`;
      });
  } catch (err) {
    console.error(err);
  }
}

async function saveStudentDay() {
  const date = document.getElementById("daily-date").value;
  if (!currentMember || !date) return;
  const sliders = Array.from(
    document.querySelectorAll("#student-points-input input[type='range']")
  );
  try {
    await Promise.all(
      sliders.map((slider) => {
        const pointId = Number(slider.dataset.pointId);
        const completed = Number(slider.value || 0);
        return api(`/api/members/${currentMember.id}/daily`, {
          method: "POST",
          body: { date, pointId, completed },
        });
      })
    );
    showToast("Today's marks saved.");
    // Refresh daily average after save
    loadStudentAverages("daily");
  } catch (err) {
    showToast(err.message || "Error saving marks.", { error: true });
  }
}

async function loadStudentAverages(period) {
  if (!currentMember) return;
  const container = document.getElementById("student-progress-list");
  await loadMemberProgress(period, currentMember.id, container);
}

function setupStudentDashboardEvents() {
  document.getElementById("daily-load-btn").addEventListener("click", () => {
    loadStudentDay();
  });
  document
    .getElementById("save-daily-btn")
    .addEventListener("click", () => saveStudentDay());

  document
    .querySelectorAll("#view-student-dashboard .period-switch .chip")
    .forEach((chip) => {
      chip.addEventListener("click", () => {
        const period = chip.getAttribute("data-period");
        document
          .querySelectorAll("#view-student-dashboard .period-switch .chip")
          .forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        loadStudentAverages(period);
      });
    });
}

// ====== ADMIN TABS ======
function setupAdminTabs() {
  document.querySelectorAll("[data-admin-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-admin-tab");
      document
        .querySelectorAll("[data-admin-tab]")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      document.querySelectorAll(".tab-panel").forEach((p) => {
        p.classList.remove("active");
      });
      document.getElementById(`admin-tab-${tab}`).classList.add("active");

      if (tab === "members") {
        loadMembersList();
      } else if (tab === "public") {
        // reuse public data under admin
        loadPublicMembers();
      }
    });
  });
}

// ====== ADMIN INITIAL DATA ======
async function refreshAdminData() {
  await loadPointsIfNeeded();
  renderAdminPoints();
  // default tab: points
  loadMembersList(); // preload for later
}

// ====== INIT APP ======
function initFromLocalStorage() {
  const savedAdmin = localStorage.getItem("admin");
  const savedMember = localStorage.getItem("member");
  if (savedAdmin) {
    try {
      currentAdmin = JSON.parse(savedAdmin);
      document.getElementById("admin-username-display").textContent =
        currentAdmin.username;
      refreshAdminData();
      showView("admin-dashboard");
      return;
    } catch (_) {}
  }
  if (savedMember) {
    try {
      currentMember = JSON.parse(savedMember);
      loadPointsIfNeeded().then(() => {
        setupStudentDashboardAfterLogin();
        showView("student-dashboard");
      });
      return;
    } catch (_) {}
  }
  showView("landing");
}

// ====== BOOTSTRAP ======
document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupPasswordToggles();
  setupAdminLogin();
  setupStudentAuth();
  setupAdminPointsUI();
  setupStudentDashboardEvents();
  setupAdminTabs();
  setupPublicPeriodSwitch();
  setTodayToDateInput("daily-date");
  initFromLocalStorage();

  // NEW: student button to view others' charts
  const btnStudentPublic = document.getElementById("btn-student-public");
  if (btnStudentPublic) {
    btnStudentPublic.addEventListener("click", () => {
      if (!currentMember && !currentAdmin) {
        // Safety check – should not normally happen on student dashboard
        showToast("Please login first.", { error: true });
        showView("student-login");
        return;
      }
      showView("public-charts");
      loadPublicMembers();
    });
  }

});
