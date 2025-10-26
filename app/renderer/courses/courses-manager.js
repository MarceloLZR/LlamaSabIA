// Gestor de cursos y progreso del estudiante
class CoursesManager {
  constructor() {
    this.currentCourse = null;
    this.currentChapter = null;
    this.currentSheet = null;
    this.progress = this.loadProgress();
  }

  // Cargar progreso desde localStorage
  loadProgress() {
    const saved = localStorage.getItem('course_progress');
    return saved ? JSON.parse(saved) : {};
  }

  // Guardar progreso
  saveProgress() {
    localStorage.setItem('course_progress', JSON.stringify(this.progress));
  }

  // Cargar curso desde JSON
  async loadCourse(courseId) {
    try {
      const response = await fetch(`data/courses/${courseId}.json`);
      this.currentCourse = await response.json();
      
      // Inicializar progreso si no existe
      if (!this.progress[courseId]) {
        this.progress[courseId] = {
          startedAt: new Date().toISOString(),
          completedSheets: [],
          scores: {}
        };
        this.saveProgress();
      }
      
      return this.currentCourse;
    } catch (error) {
      console.error('Error cargando curso:', error);
      return null;
    }
  }

  // Obtener hoja específica
  getSheet(chapterId, sheetId) {
    const chapter = this.currentCourse.chapters.find(c => c.id === chapterId);
    if (!chapter) return null;
    
    this.currentChapter = chapter;
    this.currentSheet = chapter.sheets.find(s => s.id === sheetId);
    
    return this.currentSheet;
  }

  // Verificar si una hoja está desbloqueada
  isSheetUnlocked(chapterId, sheetId) {
    const sheet = this.getSheet(chapterId, sheetId);
    if (!sheet) return false;
    
    // La primera hoja siempre está desbloqueada
    if (sheet.unlocked) return true;
    
    // Verificar si la hoja anterior está completada
    const prevSheetId = sheetId - 1;
    const progressKey = `${this.currentCourse.id}-${chapterId}-${prevSheetId}`;
    
    return this.progress[this.currentCourse.id]?.completedSheets.includes(progressKey);
  }

  // Marcar hoja como completada
  completeSheet(chapterId, sheetId, score) {
    const progressKey = `${this.currentCourse.id}-${chapterId}-${sheetId}`;
    
    if (!this.progress[this.currentCourse.id].completedSheets.includes(progressKey)) {
      this.progress[this.currentCourse.id].completedSheets.push(progressKey);
    }
    
    this.progress[this.currentCourse.id].scores[progressKey] = score;
    this.saveProgress();
    
    // Desbloquear siguiente hoja
    const nextSheet = this.getSheet(chapterId, sheetId + 1);
    if (nextSheet) {
      nextSheet.unlocked = true;
    }
  }

  // Obtener progreso total del curso
  getCourseProgress() {
    if (!this.currentCourse) return 0;
    
    const totalSheets = this.currentCourse.chapters.reduce(
      (sum, chapter) => sum + chapter.sheets.length, 
      0
    );
    
    const completed = this.progress[this.currentCourse.id]?.completedSheets.length || 0;
    
    return Math.round((completed / totalSheets) * 100);
  }

  // Obtener contexto para IA
  getAIContext() {
    if (!this.currentSheet || !this.currentCourse) {
      return "Contexto general de cursos de programación.";
    }
    
    const context = `
      Curso: ${this.currentCourse.title}
      Capítulo: ${this.currentChapter.title}
      Hoja Actual: ${this.currentSheet.title}
      
      ${this.currentCourse.aiContext}
      
      Contenido de la hoja actual:
      ${this.getSheetTextContent()}
    `;
    
    return context;
  }

  // Extraer texto del contenido
  getSheetTextContent() {
    if (!this.currentSheet) return "";
    
    return this.currentSheet.content.sections
      .map(section => section.content)
      .join('\n\n');
  }
}

// Instancia global
const coursesManager = new CoursesManager();