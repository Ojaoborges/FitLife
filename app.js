"use strict";

// =====================================================
// FITLIFE — LOGIN, PERFIL, TREINOS E ACOMPANHAMENTO
// =====================================================

// ATENÇÃO:
// Esta versão é demonstrativa e utiliza localStorage.
// Não armazene senhas ou dados de saúde reais desta forma
// em uma aplicação publicada. Para produção, use backend,
// banco de dados e autenticação segura.

const STORAGE_ACCOUNTS = "fitlife_contas_demo_v1";
const STORAGE_SESSION = "fitlife_sessao_demo_v1";

let currentEmail = null;
let profile = null;
let dailyData = null;
let authMode = "login";

const $ = (id) => document.getElementById(id);

function readJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.error("Erro ao ler dados:", error);
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function accountKey(email) {
  return `fitlife_dados_${email}`;
}

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function showMessage(elementId, message, type = "") {
  const element = $(elementId);
  element.textContent = message;
  element.className = `message ${type}`.trim();
}

function defaultDailyData() {
  return {
    date: todayKey(),
    water: 0,
    activities: []
  };
}

function saveCurrentData() {
  if (!currentEmail) return;

  writeJSON(accountKey(currentEmail), {
    profile,
    daily: dailyData
  });
}

function loadCurrentData() {
  const data = readJSON(accountKey(currentEmail), {});
  profile = data.profile || null;

  if (data.daily && data.daily.date === todayKey()) {
    dailyData = data.daily;
  } else {
    dailyData = defaultDailyData();
  }

  saveCurrentData();
}

// =====================================================
// LOGIN E CADASTRO
// =====================================================

function setAuthMode(mode) {
  authMode = mode;

  const isRegister = mode === "register";

  $("authTitle").textContent = isRegister ? "Crie sua conta" : "Bem-vindo!";
  $("authDescription").textContent = isRegister
    ? "Cadastre-se para começar a cuidar de você."
    : "Entre para acessar seus treinos personalizados.";

  $("nameField").classList.toggle("hidden", !isRegister);
  $("authName").required = isRegister;
  $("authPassword").autocomplete = isRegister
    ? "new-password"
    : "current-password";

  $("authSubmit").textContent = isRegister ? "Criar conta" : "Entrar";
  $("switchText").textContent = isRegister
    ? "Já tem uma conta?"
    : "Ainda não tem uma conta?";

  $("switchAuth").textContent = isRegister ? "Entrar" : "Cadastre-se";
  showMessage("authMessage", "");
}

$("switchAuth").addEventListener("click", () => {
  setAuthMode(authMode === "login" ? "register" : "login");
});

$("authForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const email = $("authEmail").value.trim().toLowerCase();
  const password = $("authPassword").value;
  const name = $("authName").value.trim();

  if (!email || !password) {
    showMessage("authMessage", "Preencha o e-mail e a senha.", "error");
    return;
  }

  const accounts = readJSON(STORAGE_ACCOUNTS, {});

  if (authMode === "register") {
    if (password.length < 6) {
      showMessage("authMessage", "A senha deve ter pelo menos 6 caracteres.", "error");
      return;
    }

    if (accounts[email]) {
      showMessage("authMessage", "Este e-mail já está cadastrado.", "error");
      return;
    }

    // Demonstração apenas: senha sem hash não é segura.
    accounts[email] = {
      name,
      password
    };

    writeJSON(STORAGE_ACCOUNTS, accounts);
    currentEmail = email;

    writeJSON(STORAGE_SESSION, { email });
    loadCurrentData();

    $("authForm").reset();
    openQuestionnaire();
    return;
  }

  const account = accounts[email];

  if (!account || account.password !== password) {
    showMessage("authMessage", "E-mail ou senha incorretos.", "error");
    return;
  }

  currentEmail = email;
  writeJSON(STORAGE_SESSION, { email });
  loadCurrentData();

  $("authForm").reset();

  if (!profile) {
    openQuestionnaire();
  } else {
    openApp();
  }
});

// =====================================================
// QUESTIONÁRIO DO PERFIL
// =====================================================

function openQuestionnaire() {
  $("authScreen").classList.add("hidden");
  $("appScreen").classList.add("hidden");
  $("questionnaireScreen").classList.remove("hidden");

  if (profile) {
    $("personName").value = profile.name || "";
    $("personAge").value = profile.age || "";
    $("personWeight").value = profile.weight || "";
    $("personHeight").value = profile.height || "";
    $("experience").value = profile.experience || "iniciante";
    $("goal").value = profile.goal || "saude";
    $("place").value = profile.place || "academia";
    $("days").value = String(profile.days || 3);
    $("equipment").value = profile.equipment || "";

    document.querySelectorAll('input[name="health"]').forEach((input) => {
      input.checked = (profile.health || []).includes(input.value);
    });
  } else {
    const accounts = readJSON(STORAGE_ACCOUNTS, {});
    $("personName").value = accounts[currentEmail]?.name || "";
    $("personAge").value = "";
    $("personWeight").value = "";
    $("personHeight").value = "";
    $("experience").value = "iniciante";
    $("goal").value = "saude";
    $("place").value = "academia";
    $("days").value = "3";
    $("equipment").value = "";

    document.querySelectorAll('input[name="health"]').forEach((input) => {
      input.checked = false;
    });
  }

  $("healthConsent").checked = false;
  showMessage("profileMessage", "");
}

$("noHealth").addEventListener("change", () => {
  if ($("noHealth").checked) {
    document.querySelectorAll('input[name="health"]').forEach((input) => {
      if (input.value !== "nenhum") input.checked = false;
    });
  }
});

document.querySelectorAll('input[name="health"]').forEach((input) => {
  input.addEventListener("change", () => {
    if (input.value !== "nenhum" && input.checked) {
      $("noHealth").checked = false;
    }
  });
});

$("profileForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const age = Number($("personAge").value);
  const weight = Number($("personWeight").value);
  const height = Number($("personHeight").value);
  const name = $("personName").value.trim();

  if (!name || age < 16 || age > 100 ||
      weight < 30 || weight > 350 ||
      height < 100 || height > 250) {
    showMessage(
      "profileMessage",
      "Confira seu nome, idade, peso e altura.",
      "error"
    );
    return;
  }

  if (!$("healthConsent").checked) {
    showMessage(
      "profileMessage",
      "Confirme que entendeu o aviso sobre orientação profissional.",
      "error"
    );
    return;
  }

  const health = Array.from(
    document.querySelectorAll('input[name="health"]:checked')
  ).map((input) => input.value);

  if (health.includes("nenhum") && health.length > 1) {
    showMessage(
      "profileMessage",
      "Escolha 'Nenhuma' ou marque as condições aplicáveis.",
      "error"
    );
    return;
  }

  profile = {
    name,
    age,
    weight,
    height,
    experience: $("experience").value,
    goal: $("goal").value,
    place: $("place").value,
    days: Number($("days").value),
    equipment: $("equipment").value.trim(),
    health
  };

  const accounts = readJSON(STORAGE_ACCOUNTS, {});
  if (accounts[currentEmail]) {
    accounts[currentEmail].name = name;
    writeJSON(STORAGE_ACCOUNTS, accounts);
  }

  saveCurrentData();
  openApp();
  openPage("treinos");
});

// =====================================================
// ABERTURA DO APLICATIVO
// =====================================================

function openApp() {
  $("authScreen").classList.add("hidden");
  $("questionnaireScreen").classList.add("hidden");
  $("appScreen").classList.remove("hidden");

  $("headerName").textContent = profile?.name || "Usuário";
  $("avatar").textContent = (profile?.name || "U").charAt(0).toUpperCase();

  renderEverything();
}

function logout() {
  currentEmail = null;
  profile = null;
  dailyData = null;

  localStorage.removeItem(STORAGE_SESSION);

  $("appScreen").classList.add("hidden");
  $("questionnaireScreen").classList.add("hidden");
  $("authScreen").classList.remove("hidden");

  $("authForm").reset();
  setAuthMode("login");
}

$("logoutButton").addEventListener("click", logout);

function openPage(page) {
  const titles = {
    inicio: "Visão geral",
    treinos: "Meus treinos",
    agua: "Consumo de água",
    calorias: "Atividades",
    perfil: "Meu perfil"
  };

  document.querySelectorAll(".page").forEach((section) => {
    section.classList.remove("active");
  });

  const target = $(`page-${page}`);
  if (!target) return;

  target.classList.add("active");
  $("pageTitle").textContent = titles[page] || "FitLife";

  document.querySelectorAll(".nav-link").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === page);
  });
}

document.querySelectorAll("[data-page]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    openPage(button.dataset.page);
  });
});

document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", () => {
    openPage(button.dataset.go);
  });
});

$("editProfileButton").addEventListener("click", openQuestionnaire);
$("editProfileFromWorkout").addEventListener("click", openQuestionnaire);

// =====================================================
// GERAÇÃO DO TREINO
// =====================================================

const goalNames = {
  emagrecimento: "Emagrecimento",
  hipertrofia: "Ganho de massa muscular",
  condicionamento: "Condicionamento físico",
  saude: "Saúde e bem-estar",
  forca: "Aumento de força"
};

const experienceNames = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado"
};

const placeNames = {
  academia: "Academia",
  casa: "Em casa",
  ar_livre: "Ao ar livre"
};

function makeExercise(name, sets, reps, note = "") {
  return { name, sets, reps, note };
}

function generateWorkout() {
  if (!profile) return [];

  const isHome = profile.place !== "academia";
  const isBeginner = profile.experience === "iniciante";

  const volume = isBeginner
    ? { sets: "2 séries", reps: "8–12 repetições" }
    : profile.experience === "intermediario"
      ? { sets: "3 séries", reps: "8–12 repetições" }
      : { sets: "3 séries", reps: "6–12 repetições" };

  const strengthExercises = isHome
    ? [
        makeExercise("Agachamento com o peso do corpo", volume.sets, volume.reps),
        makeExercise("Flexão adaptada na parede ou apoio", volume.sets, volume.reps),
        makeExercise("Remada com elástico, se disponível", volume.sets, volume.reps),
        makeExercise("Elevação de quadril", volume.sets, volume.reps),
        makeExercise("Prancha adaptada", volume.sets, "15–30 segundos")
      ]
    : [
        makeExercise("Agachamento guiado ou com halteres", volume.sets, volume.reps),
        makeExercise("Supino em máquina", volume.sets, volume.reps),
        makeExercise("Puxada frontal", volume.sets, volume.reps),
        makeExercise("Mesa flexora", volume.sets, volume.reps),
        makeExercise("Remada sentada", volume.sets, volume.reps)
      ];

  const cardioExercises = [
    makeExercise(
      profile.place === "ar_livre" ? "Caminhada ao ar livre" : "Caminhada leve",
      "1 sessão",
      isBeginner ? "10–20 minutos" : "20–30 minutos"
    ),
    makeExercise("Mobilidade confortável", "1 sessão", "5–10 minutos")
  ];

  let workoutDays;

  if (profile.goal === "emagrecimento" ||
      profile.goal === "condicionamento") {
    workoutDays = [
      { title: "Dia A — Corpo todo", exercises: [...strengthExercises] },
      { title: "Dia B — Cardio leve", exercises: [...cardioExercises] },
      { title: "Dia C — Corpo todo", exercises: [...strengthExercises] },
      { title: "Dia D — Movimento leve", exercises: [...cardioExercises] },
      { title: "Dia E — Corpo todo", exercises: [...strengthExercises] },
      { title: "Dia F — Recuperação ativa", exercises: [...cardioExercises] }
    ];
  } else if (profile.goal === "hipertrofia" || profile.goal === "forca") {
    workoutDays = [
      { title: "Dia A — Treino geral", exercises: [...strengthExercises] },
      { title: "Dia B — Recuperação e mobilidade", exercises: [...cardioExercises] },
      { title: "Dia C — Treino geral", exercises: [...strengthExercises] },
      { title: "Dia D — Recuperação", exercises: [...cardioExercises] },
      { title: "Dia E — Treino geral", exercises: [...strengthExercises] },
      { title: "Dia F — Atividade leve opcional", exercises: [...cardioExercises] }
    ];
  } else {
    workoutDays = [
      { title: "Dia A — Movimento geral", exercises: [...strengthExercises] },
      { title: "Dia B — Caminhada e mobilidade", exercises: [...cardioExercises] },
      { title: "Dia C — Movimento geral", exercises: [...strengthExercises] },
      { title: "Dia D — Atividade leve", exercises: [...cardioExercises] },
      { title: "Dia E — Movimento geral", exercises: [...strengthExercises] },
      { title: "Dia F — Atividade leve opcional", exercises: [...cardioExercises] }
    ];
  }

  // Mantém somente a quantidade de dias selecionada no questionário.
  return workoutDays.slice(0, profile.days);
}

function renderWorkout(targetId) {
  const target = $(targetId);
  if (!target || !profile) return;

  const workout = generateWorkout();
  const healthRestrictions = (profile.health || []).filter(
    (item) => item !== "nenhum"
  );

  let healthWarning = "";

  if (healthRestrictions.length > 0) {
    healthWarning = `
      <div class="workout-day">
        <h3>⚠️ Atenção à sua saúde</h3>
        <p>Você informou uma condição de saúde ou limitação.
        Este sistema não consegue determinar quais exercícios são seguros
        para essa condição. Procure orientação médica e de um profissional
        de educação física antes de iniciar ou alterar o treino.</p>
      </div>`;
  }

  let html = `
    <p><strong>Objetivo:</strong> ${escapeHTML(goalNames[profile.goal])}</p>
    <p><strong>Nível:</strong> ${escapeHTML(experienceNames[profile.experience])}</p>
    <p><strong>Local:</strong> ${escapeHTML(placeNames[profile.place])}</p>
    ${healthWarning}
    <div class="workout-day">
      <h3>Antes de começar</h3>
      <p>Faça um aquecimento leve e escolha movimentos que consiga executar
      com conforto. Aumente a dificuldade gradualmente, sem ignorar dores.</p>
    </div>`;

  workout.forEach((day) => {
    html += `
      <article class="workout-day">
        <h3>${escapeHTML(day.title)}</h3>
        <ul>
          ${day.exercises.map((exercise) => `
            <li>
              <strong>${escapeHTML(exercise.name)}</strong> —
              ${escapeHTML(exercise.sets)}, ${escapeHTML(exercise.reps)}
              ${exercise.note ? `<div class="exercise-note">${escapeHTML(exercise.note)}</div>` : ""}
            </li>
          `).join("")}
        </ul>
      </article>`;
  });

  html += `
    <p class="muted">
      Este plano é uma sugestão geral gerada pelas suas escolhas, não uma
      avaliação profissional. Ajuste os exercícios com um profissional,
      principalmente se tiver lesões, sintomas ou doenças.
    </p>`;

  target.innerHTML = html;
}

// =====================================================
// ÁGUA
// =====================================================

function addWater(amount) {
  dailyData.water += amount;
  saveCurrentData();
  renderEverything();
}

document.querySelectorAll("[data-water]").forEach((button) => {
  button.addEventListener("click", () => {
    addWater(Number(button.dataset.water));
  });
});


// =====================================================
// REGISTRO DE ATIVIDADES E ESTIMATIVA DE CALORIAS
// =====================================================

const activityNames = {
  caminhada: "Caminhada",
  corrida: "Corrida",
  musculacao: "Musculação",
  bicicleta: "Bicicleta",
  funcional: "Treino funcional",
  alongamento: "Alongamento"
};

// Valores aproximados de MET para estimativa educativa.
const activityMET = {
  caminhada: 3.5,
  corrida: 8,
  musculacao: 4,
  bicicleta: 6,
  funcional: 6,
  alongamento: 2.3
};

const activityForm = document.getElementById("activityForm");

activityForm.addEventListener("submit", function (event) {
  // Impede que o formulário recarregue a página.
  event.preventDefault();
  event.stopPropagation();

  // Confere se a sessão e o perfil continuam disponíveis.
  if (!currentEmail || !profile || !dailyData) {
    alert("Sua sessão não está ativa. Entre novamente.");
    return;
  }

  const type = document.getElementById("activityType").value;
  const hours = Number(document.getElementById("activityHours").value);
  const minutes = Number(document.getElementById("activityMinutes").value);

  const duration = hours * 60 + minutes;

  if (!Number.isFinite(duration) || duration <= 0 || duration > 720) {
    alert("Informe uma duração entre 1 minuto e 12 horas.");
    return;
  }

  const weight = Number(profile.weight || 70);
  const met = activityMET[type];

  if (!met) {
    alert("Selecione uma atividade válida.");
    return;
  }

  // Estimativa aproximada de calorias gastas.
  const calories = Math.round(
    (met * 3.5 * weight / 200) * duration
  );

  dailyData.activities.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: type,
    duration: duration,
    calories: calories,
    time: new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    })
  });

  try {
    // Salva os dados sem encerrar a sessão.
    saveCurrentData();
    renderEverything();

    activityForm.reset();
    document.getElementById("activityHours").value = 0;
    document.getElementById("activityMinutes").value = 30;

    alert("Atividade registrada com sucesso!");
  } catch (error) {
    console.error("Erro ao salvar a atividade:", error);
    alert("Não foi possível salvar a atividade. Confira o console do navegador.");
  }
});

function removeActivity(id) {
  dailyData.activities = dailyData.activities.filter(
    (activity) => activity.id !== id
  );

  saveCurrentData();
  renderEverything();
}

function renderActivities() {
  const list = $("activityList");

  if (!dailyData.activities.length) {
    list.innerHTML = '<p class="empty-state">Nenhuma atividade registrada hoje.</p>';
    return;
  }

  list.innerHTML = dailyData.activities.map((activity) => `
    <div class="activity-item">
      <div>
        <strong>${escapeHTML(activityNames[activity.type])}</strong>
        <div class="muted">
          ${activity.duration} min · ${escapeHTML(activity.time)}
        </div>
      </div>
      <div>
        <strong>~${activity.calories} kcal</strong>
        <button class="text-btn" data-remove-activity="${escapeHTML(activity.id)}">
          Remover
        </button>
      </div>
    </div>
  `).join("");

  list.querySelectorAll("[data-remove-activity]").forEach((button) => {
    button.addEventListener("click", () => {
      removeActivity(button.dataset.removeActivity);
    });
  });
}

// =====================================================
// PERFIL E PAINEL PRINCIPAL
// =====================================================

function renderProfile() {
  const bmi = profile.weight / Math.pow(profile.height / 100, 2);

  const healthLabels = {
    cardiaco: "Problemas cardíacos ou pressão alta",
    respiratorio: "Problemas respiratórios",
    articular: "Lesões ou dores nas articulações/coluna",
    metabolico: "Diabetes ou condição metabólica",
    outro: "Outra condição ou limitação",
    nenhum: "Nenhuma condição informada"
  };

  const healthText = profile.health?.length
    ? profile.health.map((item) => healthLabels[item] || item).join(", ")
    : "Não informado";

  $("profileSummary").innerHTML = `
    <div class="profile-grid">
      <div class="profile-item">
        <span>Nome</span>
        <strong>${escapeHTML(profile.name)}</strong>
      </div>
      <div class="profile-item">
        <span>Idade</span>
        <strong>${profile.age} anos</strong>
      </div>
      <div class="profile-item">
        <span>Peso</span>
        <strong>${profile.weight} kg</strong>
      </div>
      <div class="profile-item">
        <span>Altura</span>
        <strong>${profile.height} cm</strong>
      </div>
      <div class="profile-item">
        <span>Objetivo</span>
        <strong>${escapeHTML(goalNames[profile.goal])}</strong>
      </div>
      <div class="profile-item">
        <span>Experiência</span>
        <strong>${escapeHTML(experienceNames[profile.experience])}</strong>
      </div>
      <div class="profile-item">
        <span>Local de treino</span>
        <strong>${escapeHTML(placeNames[profile.place])}</strong>
      </div>
      <div class="profile-item">
        <span>Dias por semana</span>
        <strong>${profile.days}</strong>
      </div>
      <div class="profile-item">
        <span>Equipamentos</span>
        <strong>${escapeHTML(profile.equipment || "Não informado")}</strong>
      </div>
      <div class="profile-item">
        <span>Condições informadas</span>
        <strong>${escapeHTML(healthText)}</strong>
      </div>
    </div>
    <p class="muted">
      IMC calculado apenas como referência matemática: ${bmi.toFixed(1)}.
      Esse número isolado não diagnostica saúde nem define um treino.
    </p>`;
}

function renderEverything() {
  if (!profile || !dailyData) return;

  $("headerName").textContent = profile.name;
  $("avatar").textContent = profile.name.charAt(0).toUpperCase();

  const calories = dailyData.activities.reduce(
    (sum, activity) => sum + activity.calories, 0
  );

  const minutes = dailyData.activities.reduce(
    (sum, activity) => sum + activity.duration, 0
  );

  const waterGoal = 2000;
  const waterPercentage = Math.min(
    100,
    dailyData.water / waterGoal * 100
  );

  $("dashWater").textContent = `${dailyData.water} ml`;
  $("dashWaterSub").textContent =
    `${Math.round(waterPercentage)}% da meta de referência`;

  $("dashWaterBar").style.width = `${waterPercentage}%`;
  $("dashCalories").textContent = `${calories} kcal`;
  $("dashMinutes").textContent = `${minutes} min`;

  $("waterTotal").textContent = `${dailyData.water} ml`;
  $("waterGoal").textContent = `Meta de referência: ${waterGoal} ml`;
  $("waterBar").style.width = `${waterPercentage}%`;

  $("dashboardGoal").textContent =
    `Objetivo: ${goalNames[profile.goal]}`;

  renderWorkout("dashboardWorkout");
  renderWorkout("workoutResult");
  renderActivities();
  renderProfile();
}

// =====================================================
// INICIALIZAÇÃO E RESTAURAÇÃO DA SESSÃO
// =====================================================

function initializeApp() {
  const session = readJSON(STORAGE_SESSION, null);

  if (!session?.email) {
    $("authScreen").classList.remove("hidden");
    $("questionnaireScreen").classList.add("hidden");
    $("appScreen").classList.add("hidden");
    return;
  }

  const accounts = readJSON(STORAGE_ACCOUNTS, {});
  if (!accounts[session.email]) {
    localStorage.removeItem(STORAGE_SESSION);
    $("authScreen").classList.remove("hidden");
    return;
  }

  currentEmail = session.email;
  loadCurrentData();

  if (!profile) {
    openQuestionnaire();
  } else {
    openApp();
  }
}

initializeApp();