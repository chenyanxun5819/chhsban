import { useState } from 'react';
import './styles/App.css';
import { StudentRoster } from './pages/StudentRoster';
import { StudentList } from './pages/StudentList';
import TeacherSearch from './pages/TeacherSearch';

type PageType = 'student' | 'list' | 'teacher';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('student');

  return (
    <div className="app">
      <header>
        <h1>芙中教务处公文编辑系统</h1>
      </header>
      <div className="app-container">
        <nav className="page-nav">
          <button
            className={`nav-btn ${currentPage === 'student' ? 'active' : ''}`}
            onClick={() => setCurrentPage('student')}
          >
            学生查询
          </button>
          <button
            className={`nav-btn ${currentPage === 'list' ? 'active' : ''}`}
            onClick={() => setCurrentPage('list')}
          >
            学生名单
          </button>
          <button
            className={`nav-btn ${currentPage === 'teacher' ? 'active' : ''}`}
            onClick={() => setCurrentPage('teacher')}
          >
            教师查询
          </button>
        </nav>
        <main>
          {currentPage === 'student' && <StudentRoster />}
          {currentPage === 'list' && <StudentList />}
          {currentPage === 'teacher' && <TeacherSearch />}
        </main>
      </div>
    </div>
  );
}

export default App;
