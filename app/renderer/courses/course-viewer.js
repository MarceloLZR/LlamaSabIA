// Visor de contenido de cursos
class CourseViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentExerciseIndex = 0;
    this.correctAnswers = []; // Guardar respuestas correctas
    this.aiModalOpen = false;
    this.currentChapterId = null;
    this.currentSheetId = null;
    this.currentSheet = null;
  }

  // Renderizar lista de cursos
  renderCourseList(courses) {
    console.log('📋 Renderizando lista de cursos:', courses);
    
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
        <button onclick="resetCourseProgress()" class="reset-button" style="background: #ef4444; color: white; padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer;">
          🔄 Reiniciar Progreso
        </button>
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
            const sheetId = `${course.id}-${chapter.id}-${sheet.id}`;
            const isUnlocked = coursesManager.isSheetUnlocked(chapter.id, sheet.id);
            const isCompleted = coursesManager.progress[course.id]?.completedSheets?.includes(sheetId);
            
            // Verificar si hay progreso en test
            const testProgress = coursesManager.getTestProgress(chapter.id, sheet.id);
            const hasProgress = testProgress && testProgress.currentExercise > 0;
            
            // Determinar icono según el tipo y estado
            let icon = '🔒';
            if (isCompleted) {
              icon = '✅';
            } else if (hasProgress) {
              icon = '⏸️'; // Test en progreso
            } else if (isUnlocked) {
              icon = sheet.type === 'test' ? '📝' : '📄';
            }
            
            return `
              <button 
                class="sheet-item ${isUnlocked ? '' : 'locked'} ${isCompleted ? 'completed' : ''}"
                onclick="courseViewer.loadSheet(${chapter.id}, ${sheet.id})"
                ${!isUnlocked ? 'disabled' : ''}
                style="${!isUnlocked ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
              >
                <span class="sheet-icon">${icon}</span>
                <div class="sheet-info">
                  <div class="sheet-title">${sheet.title}</div>
                  <div class="sheet-duration">
                    ${sheet.duration}
                    ${hasProgress ? ` • ${testProgress.currentExercise + 1}/${sheet.exercises.length}` : ''}
                  </div>
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

  // Cargar hoja (puede ser contenido o test)
  loadSheet(chapterId, sheetId) {
    const sheet = coursesManager.getSheet(chapterId, sheetId);
    if (!sheet) return;
    
    // Guardar referencias
    this.currentChapterId = chapterId;
    this.currentSheetId = sheetId;
    this.currentSheet = sheet;
    
    // Renderizar según el tipo
    if (sheet.type === 'test') {
      // Cargar progreso guardado si existe
      const testProgress = coursesManager.getTestProgress(chapterId, sheetId);
      this.currentExerciseIndex = testProgress ? testProgress.currentExercise : 0;
      this.correctAnswers = testProgress ? testProgress.answers : [];
      
      this.renderTest(sheet, chapterId, sheetId);
    } else {
      this.renderContent(sheet, chapterId, sheetId);
    }
  }

  // Renderizar CONTENIDO de estudio
  renderContent(sheet, chapterId, sheetId) {
    const contentHtml = sheet.content.sections.map(section => {
      switch(section.type) {
        case 'text':
          return `<div class="content-text">${this.parseMarkdown(section.content)}</div>`;
        case 'image':
          return `
            <figure class="content-image ${section.size || ''}">
              <img src="${section.src}" alt="${section.alt || 'Imagen del curso'}" loading="lazy">
              ${section.caption ? `<figcaption>${section.caption}</figcaption>` : ''}
            </figure>
          `;
        case 'warning':
          return `<div class="content-box warning">⚠️ ${this.parseMarkdown(section.content)}</div>`;
        case 'info':
          return `<div class="content-box info">💡 ${this.parseMarkdown(section.content)}</div>`;
        case 'success':
          return `<div class="content-box success">✅ ${this.parseMarkdown(section.content)}</div>`;
        default:
          return '';
      }
    }).join('');
    
    const course = coursesManager.currentCourse;
    const chapter = course.chapters.find(ch => ch.id === chapterId);
    const nextTestSheet = chapter?.sheets.find(s => 
      s.type === 'test' && s.requiresCompletion === sheetId
    );
    
    this.container.innerHTML = `
      <div class="sheet-content-wrapper">
        <div class="sheet-header">
          <div class="header-navigation">
            ${(() => {
              const chapter = coursesManager.currentCourse.chapters.find(ch => ch.id === chapterId);
              const prevSheet = chapter?.sheets.find(s => s.id === sheetId - 1);
              return prevSheet ? `
                <button onclick="courseViewer.loadSheet(${chapterId}, ${prevSheet.id})" class="prev-button" title="Hoja anterior">
                  ← Anterior
                </button>
              ` : '';
            })()}
            <button onclick="courseViewer.loadCourse('${coursesManager.currentCourse.id}')" class="back-button">
              ← Volver al Curso
            </button>
          </div>
          <h2>${sheet.title}</h2>
          <span class="sheet-duration">⏱️ ${sheet.duration}</span>
        </div>
        
        <div class="sheet-body">
          ${contentHtml}
        </div>
        
        ${nextTestSheet ? `
          <div class="test-separator">
            <div class="test-divider">
              <span class="test-divider-text">📝 Test de Comprensión</span>
            </div>
            
            <div class="test-intro">
              <h3>¡Completaste el contenido!</h3>
              <p>Ahora pon a prueba lo aprendido con el test de comprensión.</p>
              <div class="test-intro-actions">
                <button onclick="courseViewer.loadSheet(${chapterId}, ${nextTestSheet.id})" class="start-test-button">
                  Ir al Test →
                </button>
                <button onclick="courseViewer.loadCourse('${coursesManager.currentCourse.id}')" class="secondary-button">
                  Volver al Curso
                </button>
              </div>
            </div>
          </div>
        ` : `
          <div class="completion-message">
            <div class="completion-icon">🎉</div>
            <h3>¡Contenido Completado!</h3>
            <p>Has terminado esta lección</p>
            <button onclick="courseViewer.loadCourse('${coursesManager.currentCourse.id}')" class="continue-button">
              Continuar →
            </button>
          </div>
        `}
      </div>
      
      <button class="ai-float-button" onclick="courseViewer.toggleAIModal()" title="Asistente IA">
        🦙
      </button>
      
      <div id="aiModal" class="ai-modal" style="display: none;">
        <div class="ai-modal-content">
          <div class="ai-modal-header">
            <h4>🦙 Asistente IA</h4>
            <button class="ai-close-btn" onclick="courseViewer.toggleAIModal()">✕</button>
          </div>
          <div class="ai-modal-body">
            <p class="ai-hint">Pregúntame sobre esta hoja</p>
            <textarea id="aiQuestion" placeholder="Ej: ¿Puedes explicarme mejor este concepto?" rows="3"></textarea>
            <button onclick="courseViewer.askAI()" class="ai-ask-button">Preguntar 🚀</button>
            <div id="aiResponse" class="ai-response"></div>
          </div>
        </div>
      </div>
    `;
    
    // Marcar como completada
    coursesManager.completeSheet(chapterId, sheetId, 100);
  }

  // Toggle modal de IA
  toggleAIModal() {
    const modal = document.getElementById('aiModal');
    this.aiModalOpen = !this.aiModalOpen;
    modal.style.display = this.aiModalOpen ? 'flex' : 'none';
  }

  // Renderizar TEST
  renderTest(sheet, chapterId, sheetId) {
    if (!sheet.exercises || sheet.exercises.length === 0) return;
    
    // Verificar si hay progreso guardado
    const testProgress = coursesManager.getTestProgress(chapterId, sheetId);
    const hasSavedProgress = testProgress && testProgress.currentExercise > 0;
    
    this.container.innerHTML = `
      <div class="sheet-content-wrapper">
        <div class="sheet-header">
          <div class="header-navigation">
            ${(() => {
              const chapter = coursesManager.currentCourse.chapters.find(ch => ch.id === chapterId);
              const prevSheet = chapter?.sheets.find(s => s.id === sheetId - 1);
              return prevSheet ? `
                <button onclick="courseViewer.loadSheet(${chapterId}, ${prevSheet.id})" class="prev-button" title="Hoja anterior">
                  ← Anterior
                </button>
              ` : '';
            })()}
            <button onclick="courseViewer.loadCourse('${coursesManager.currentCourse.id}')" class="back-button">
              ← Volver al Curso
            </button>
          </div>
          <h2>📝 ${sheet.title}</h2>
          <span class="sheet-duration">⏱️ ${sheet.duration}</span>
        </div>
        
        <div class="sheet-body">
          <div class="content-text">
            <h1>Test de Comprensión</h1>
            <p>Responde las siguientes preguntas para verificar que has comprendido los conceptos.</p>
            ${hasSavedProgress ? `
              <div class="content-box info">
                💾 Tienes progreso guardado en pregunta ${testProgress.currentExercise + 1} de ${sheet.exercises.length}
              </div>
            ` : ''}
          </div>
        </div>
        
        <div class="sheet-exercises">
          <div id="exerciseContainer"></div>
        </div>
      </div>
      
      <button class="ai-float-button" onclick="courseViewer.toggleAIModal()" title="Asistente IA">
        🦙
      </button>
      
      <div id="aiModal" class="ai-modal" style="display: none;">
        <div class="ai-modal-content">
          <div class="ai-modal-header">
            <h4>🦙 Asistente IA</h4>
            <button class="ai-close-btn" onclick="courseViewer.toggleAIModal()">✕</button>
          </div>
          <div class="ai-modal-body">
            <p class="ai-hint">Pregúntame sobre el contenido (no te daré las respuestas 😉)</p>
            <textarea id="aiQuestion" placeholder="Ej: ¿Puedes explicarme mejor este concepto?" rows="3"></textarea>
            <button onclick="courseViewer.askAI()" class="ai-ask-button">Preguntar 🚀</button>
            <div id="aiResponse" class="ai-response"></div>
          </div>
        </div>
      </div>
    `;
    
    // Renderizar ejercicio actual
    this.renderExercise(sheet.exercises[this.currentExerciseIndex]);
  }

  // Renderizar ejercicio individual
  renderExercise(exercise) {
    const container = document.getElementById('exerciseContainer');
    const totalExercises = this.currentSheet.exercises.length;
    const progressInfo = `Pregunta ${this.currentExerciseIndex + 1} de ${totalExercises}`;
    
    let exerciseHtml = '';
    
    if (exercise.type === 'multiple_choice') {
      exerciseHtml = `
        <div class="exercise-question">
          <h3>${exercise.question}</h3>
          <div class="options-container">
            ${exercise.options.map((opt, i) => `
              <label class="option-label">
                <input type="radio" name="answer" value="${i}">
                <span>${opt}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `;
    } else if (exercise.type === 'text') {
      exerciseHtml = `
        <div class="exercise-question">
          <h3>${exercise.question}</h3>
          <input type="text" id="textAnswer" class="text-answer-input" placeholder="Escribe tu respuesta aquí">
        </div>
      `;
    }
    
    container.innerHTML = `
      <div class="exercise-card">
        <div class="exercise-progress">${progressInfo}</div>
        ${exerciseHtml}
        <button onclick="courseViewer.checkAnswer()" class="check-button">
          Verificar Respuesta
        </button>
        <div id="exerciseFeedback"></div>
      </div>
    `;
  }

  // Verificar respuesta
  checkAnswer() {
    const exercise = this.currentSheet.exercises[this.currentExerciseIndex];
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
      const textInput = document.getElementById('textAnswer');
      if (!textInput) {
        feedback.innerHTML = '<div class="feedback-warning">⚠️ Error al leer la respuesta</div>';
        return;
      }
      userAnswer = textInput.value.toLowerCase().trim();
      if (!userAnswer) {
        feedback.innerHTML = '<div class="feedback-warning">⚠️ Por favor escribe una respuesta</div>';
        return;
      }
      isCorrect = userAnswer === exercise.answer.toLowerCase();
    }
    
    const totalExercises = this.currentSheet.exercises.length;
    const isLastExercise = this.currentExerciseIndex >= totalExercises - 1;
    
    if (isCorrect) {
      // Guardar respuesta correcta
      this.correctAnswers.push(this.currentExerciseIndex);
      
      feedback.innerHTML = `
        <div class="feedback-success">
          ✅ ¡Correcto! ${exercise.explanation}
          <button onclick="courseViewer.nextExercise()" class="next-button">
            ${isLastExercise ? 'Finalizar Test ✓' : 'Siguiente Pregunta →'}
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
  nextExercise() {
    const totalExercises = this.currentSheet.exercises.length;
    
    this.currentExerciseIndex++;
    
    // Guardar progreso
    coursesManager.saveTestProgress(
      this.currentChapterId, 
      this.currentSheetId, 
      this.currentExerciseIndex,
      this.correctAnswers
    );
    
    if (this.currentExerciseIndex < totalExercises) {
      this.renderExercise(this.currentSheet.exercises[this.currentExerciseIndex]);
    } else {
      // Completar test
      const score = Math.round((this.correctAnswers.length / totalExercises) * 100);
      coursesManager.completeSheet(this.currentChapterId, this.currentSheetId, score);
      this.showCompletionMessage(score);
    }
  }

  // Mensaje de completación
  showCompletionMessage(score = 100) {
    const container = document.getElementById('exerciseContainer');
    container.innerHTML = `
      <div class="completion-message">
        <div class="completion-icon">🎉</div>
        <h3>¡Test Completado!</h3>
        <p>Puntuación: ${score}%</p>
        <p>Has desbloqueado la siguiente hoja de estudio</p>
        <button onclick="courseViewer.loadCourse('${coursesManager.currentCourse.id}')" class="continue-button">
          Continuar al Curso →
        </button>
      </div>
    `;
  }

  // Preguntar a la IA
  async askAI() {
    const question = document.getElementById('aiQuestion').value.trim();
    const responseDiv = document.getElementById('aiResponse');
    
    if (!question) {
      responseDiv.innerHTML = '<div class="ai-error">⚠️ Escribe una pregunta primero</div>';
      return;
    }
    
    responseDiv.innerHTML = '<div class="ai-loading">🤖 Pensando...</div>';
    
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
    console.log('📚 Mostrando lista de cursos');
    this.renderCourseList([
      {
        id: 'fundamentos-ia',
        title: 'Fundamentos de Matemática para IA',
        description: 'Entiende las funciones de activación desde cero',
        duration: '3 semanas',
        difficulty: 'Principiante',
        icon: '🧮'
      },
      {
        id: 'algebra-lineal-ia',
        title: 'Algebra Lineal para IA',
        description: 'Entiende el algebra lineal aplicado a IA desde cero',
        duration: '3 semanas',
        difficulty: 'Principiante',
        icon: '🔢'
      }
    ]);
  }
}

// Instancia global
const courseViewer = new CourseViewer('coursesView');
console.log('✅ courseViewer creado');

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, '<br>');
}