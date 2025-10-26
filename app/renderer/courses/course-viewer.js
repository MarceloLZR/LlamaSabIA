// Visor de contenido de cursos
class CourseViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentExerciseIndex = 0;
  }

  // Renderizar lista de cursos
  renderCourseList(courses) {
    const html = courses.map(course => `
      <div class="course-card" onclick="courseViewer.loadCourse('${course.id}')">
        <div class="course-icon">${course.icon}</div>
        <h3>${course.title}</h3>
        <p>${course.description}</p>
        <div class="course-meta">
          <span>⏱️ ${course.duration}</span>
          <span>📊 ${course.difficulty}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${coursesManager.getCourseProgress()}%"></div>
        </div>
      </div>
    `).join('');
    
    this.container.innerHTML = `
      <div class="view-header">
        <h1>📚 Cursos Disponibles</h1>
      </div>
      <div class="courses-grid">${html}</div>
    `;
  }

  // Cargar y mostrar curso
  async loadCourse(courseId) {
    const course = await coursesManager.loadCourse(courseId);
    if (!course) {
      alert('Error al cargar el curso');
      return;
    }
    
    this.renderCourseOverview(course);
  }

  // Vista general del curso (capítulos)
  renderCourseOverview(course) {
    const chaptersHtml = course.chapters.map(chapter => `
      <div class="chapter-card">
        <h3>📖 ${chapter.title}</h3>
        <div class="sheets-list">
          ${chapter.sheets.map(sheet => {
            const isUnlocked = coursesManager.isSheetUnlocked(chapter.id, sheet.id);
            const isCompleted = coursesManager.progress[course.id]?.completedSheets
              .includes(`${course.id}-${chapter.id}-${sheet.id}`);
            
            return `
              <button 
                class="sheet-item ${isUnlocked ? '' : 'locked'} ${isCompleted ? 'completed' : ''}"
                onclick="courseViewer.loadSheet(${chapter.id}, ${sheet.id})"
                ${!isUnlocked ? 'disabled' : ''}
              >
                <span class="sheet-icon">
                  ${isCompleted ? '✅' : isUnlocked ? '📄' : '🔒'}
                </span>
                <div class="sheet-info">
                  <div class="sheet-title">${sheet.title}</div>
                  <div class="sheet-duration">${sheet.duration}</div>
                </div>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `).join('');
    
    this.container.innerHTML = `
      <div class="course-header">
        <button onclick="courseViewer.showCourseList()" class="back-button">← Volver</button>
        <div>
          <h1>${course.icon} ${course.title}</h1>
          <p class="subtitle">${course.description}</p>
        </div>
        <div class="course-progress-badge">
          ${coursesManager.getCourseProgress()}% Completado
        </div>
      </div>
      <div class="chapters-container">${chaptersHtml}</div>
    `;
  }

  // Cargar hoja de estudio
  loadSheet(chapterId, sheetId) {
    const sheet = coursesManager.getSheet(chapterId, sheetId);
    if (!sheet) return;
    
    this.currentExerciseIndex = 0;
    this.renderSheet(sheet, chapterId, sheetId);
  }

  // Renderizar hoja de estudio
  renderSheet(sheet, chapterId, sheetId) {
    const contentHtml = sheet.content.sections.map(section => {
      switch(section.type) {
        case 'text':
          return `<div class="content-text">${this.parseMarkdown(section.content)}</div>`;
        case 'warning':
          return `<div class="content-box warning">⚠️ ${section.content}</div>`;
        case 'info':
          return `<div class="content-box info">💡 ${section.content}</div>`;
        case 'success':
          return `<div class="content-box success">✅ ${section.content}</div>`;
        default:
          return '';
      }
    }).join('');
    
    this.container.innerHTML = `
      <div class="sheet-viewer">
        <div class="sheet-sidebar">
          <button onclick="courseViewer.loadCourse('${coursesManager.currentCourse.id}')" class="back-button">
            ← Volver al Curso
          </button>
          
          <div class="ai-assistant-box">
            <h4>🤖 Asistente IA</h4>
            <p>Pregúntame sobre esta hoja</p>
            <textarea id="aiQuestion" placeholder="Ej: ¿Puedes explicarme el método Pomodoro?"></textarea>
            <button onclick="courseViewer.askAI()" class="ai-button">Preguntar</button>
            <div id="aiResponse" class="ai-response"></div>
          </div>
        </div>
        
        <div class="sheet-content">
          <div class="sheet-header">
            <h2>${sheet.title}</h2>
            <span class="sheet-duration">⏱️ ${sheet.duration}</span>
          </div>
          
          <div class="sheet-body">
            ${contentHtml}
          </div>
          
          ${sheet.exercises.length > 0 ? `
            <div class="sheet-exercises">
              <h3>📝 Test de Calentamiento</h3>
              <div id="exerciseContainer"></div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    
    if (sheet.exercises.length > 0) {
      this.renderExercise(sheet.exercises[this.currentExerciseIndex], chapterId, sheetId);
    }
  }

  // Renderizar ejercicio
  renderExercise(exercise, chapterId, sheetId) {
    const container = document.getElementById('exerciseContainer');
    if (!container) return;
    
    const sheet = coursesManager.currentSheet;
    const totalExercises = sheet.exercises.length;
    
    let optionsHtml = '';
    if (exercise.type === 'multiple_choice') {
      optionsHtml = exercise.options.map((option, index) => `
        <label class="option-label">
          <input type="radio" name="answer" value="${index}">
          <span>${option}</span>
        </label>
      `).join('');
    } else if (exercise.type === 'text') {
      optionsHtml = `
        <input type="text" id="textAnswer" class="text-answer" placeholder="Escribe tu respuesta aquí">
      `;
    }
    
    container.innerHTML = `
      <div class="exercise-card">
        <div class="exercise-header">
          <span class="exercise-number">Pregunta ${this.currentExerciseIndex + 1} de ${totalExercises}</span>
        </div>
        
        <div class="exercise-question">
          ${exercise.question}
        </div>
        
        <div class="exercise-options">
          ${optionsHtml}
        </div>
        
        <div class="exercise-actions">
          <button onclick="courseViewer.checkAnswer(${chapterId}, ${sheetId})" class="check-button">
            Verificar Respuesta
          </button>
        </div>
        
        <div id="exerciseFeedback" class="exercise-feedback"></div>
      </div>
    `;
  }

  // Verificar respuesta
  checkAnswer(chapterId, sheetId) {
    const sheet = coursesManager.currentSheet;
    const exercise = sheet.exercises[this.currentExerciseIndex];
    const feedback = document.getElementById('exerciseFeedback');
    
    let userAnswer;
    let isCorrect = false;
    
    if (exercise.type === 'multiple_choice') {
      const selected = document.querySelector('input[name="answer"]:checked');
      if (!selected) {
        feedback.innerHTML = '<div class="feedback-warning">⚠️ Por favor selecciona una opción</div>';
        return;
      }
      userAnswer = parseInt(selected.value);
      isCorrect = userAnswer === exercise.correct;
    } else if (exercise.type === 'text') {
      userAnswer = document.getElementById('textAnswer').value.toLowerCase().trim();
      isCorrect = userAnswer === exercise.answer.toLowerCase();
    }
    
    if (isCorrect) {
      feedback.innerHTML = `
        <div class="feedback-success">
          ✅ ¡Correcto! ${exercise.explanation}
          <button onclick="courseViewer.nextExercise(${chapterId}, ${sheetId})" class="next-button">
            ${this.currentExerciseIndex < sheet.exercises.length - 1 ? 'Siguiente Pregunta →' : 'Finalizar Hoja ✓'}
          </button>
        </div>
      `;
    } else {
      feedback.innerHTML = `
        <div class="feedback-error">
          ❌ Incorrecto. ${exercise.explanation}
          <button onclick="document.getElementById('exerciseFeedback').innerHTML = ''" class="retry-button">
            Intentar de Nuevo
          </button>
        </div>
      `;
    }
  }

  // Siguiente ejercicio
  nextExercise(chapterId, sheetId) {
    const sheet = coursesManager.currentSheet;
    
    this.currentExerciseIndex++;
    
    if (this.currentExerciseIndex < sheet.exercises.length) {
      this.renderExercise(sheet.exercises[this.currentExerciseIndex], chapterId, sheetId);
    } else {
      // Completar hoja
      coursesManager.completeSheet(chapterId, sheetId, 100);
      this.showCompletionMessage(chapterId, sheetId);
    }
  }

  // Mensaje de completación
  showCompletionMessage(chapterId, sheetId) {
    const container = document.getElementById('exerciseContainer');
    container.innerHTML = `
      <div class="completion-message">
        <div class="completion-icon">🎉</div>
        <h3>¡Hoja Completada!</h3>
        <p>Has desbloqueado la siguiente hoja de estudio</p>
        <button onclick="courseViewer.loadCourse('${coursesManager.currentCourse.id}')" class="continue-button">
          Continuar al Curso →
        </button>
      </div>
    `;
  }

  // Preguntar a la IA sobre la hoja actual
  async askAI() {
    const question = document.getElementById('aiQuestion').value.trim();
    const responseDiv = document.getElementById('aiResponse');
    
    if (!question) {
      responseDiv.innerHTML = '<div class="ai-error">⚠️ Escribe una pregunta primero</div>';
      return;
    }
    
    responseDiv.innerHTML = '<div class="ai-loading">🤖 Pensando...</div>';
    
    // Obtener contexto del curso actual
    const context = coursesManager.getAIContext();
    
    try {
      const response = await fetch('http://127.0.0.1:8080/completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${context}\n\nEstudiante: ${question}\nAsistente:`,
          temperature: 0.7,
          max_tokens: 300
        })
      });
      
      const data = await response.json();
      responseDiv.innerHTML = `<div class="ai-answer">${escapeHtml(data.content.trim())}</div>`;
      document.getElementById('aiQuestion').value = '';
    } catch (error) {
      responseDiv.innerHTML = '<div class="ai-error">❌ Error al conectar con la IA</div>';
    }
  }

  // Parser Markdown simple
  parseMarkdown(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/## (.*?)\n/g, '<h2>$1</h2>')
      .replace(/### (.*?)\n/g, '<h3>$1</h3>')
      .replace(/# (.*?)\n/g, '<h1>$1</h1>')
      .replace(/\n/g, '<br>');
  }

  // Mostrar lista de cursos
  showCourseList() {
    this.renderCourseList([
      {
        id: 'fundamentos-ia',
        title: 'Fundamentos de Matemática para IA',
        description: 'Entiende las funciones de activación desde cero',
        duration: '3 semanas',
        difficulty: 'Principiante',
        icon: '🧮'
      }
    ]);
  }
}

// Instancia global
const courseViewer = new CourseViewer('coursesView');

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, '<br>');
}