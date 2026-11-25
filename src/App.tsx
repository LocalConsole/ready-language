import { lazy } from 'react';
import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useProgress } from '@/store/progress';

const Home = lazy(() => import('@/pages/Home'));
const Start = lazy(() => import('@/pages/Start'));
const Practice = lazy(() => import('@/pages/Practice'));
const Profile = lazy(() => import('@/pages/Profile'));
const Settings = lazy(() => import('@/pages/Settings'));
const Sources = lazy(() => import('@/pages/Sources'));
const Dash = lazy(() => import('@/pages/Dash'));
const Diagnostic = lazy(() => import('@/features/diagnostic/Diagnostic'));
const Path = lazy(() => import('@/features/lessons/Path'));
const LessonPage = lazy(() => import('@/features/lessons/Lesson'));
const VocabHub = lazy(() => import('@/features/vocab/VocabHub'));
const NewWords = lazy(() => import('@/features/vocab/NewWords'));
const SrsReview = lazy(() => import('@/features/vocab/SrsReview'));
const WordMode = lazy(() => import('@/features/vocab/WordMode'));
const WordList = lazy(() => import('@/features/vocab/WordList'));
const Books = lazy(() => import('@/features/vocab/Books'));
const Homework = lazy(() => import('@/features/vocab/Homework'));
const ReaderLibrary = lazy(() => import('@/features/reader/ReaderLibrary'));
const Reader = lazy(() => import('@/features/reader/Reader'));
const MistakeReview = lazy(() => import('@/features/mistakes/MistakeReview'));
const Journal = lazy(() => import('@/features/mistakes/Journal'));
const JournalTrain = lazy(() => import('@/features/mistakes/JournalTrain'));
const QuickTest = lazy(() => import('@/features/mistakes/QuickTest'));
const WritingList = lazy(() => import('@/features/writing/WritingList'));
const WriteTask = lazy(() => import('@/features/writing/WriteTask'));
const Speaking = lazy(() => import('@/features/speaking/Speaking'));
const Shadow = lazy(() => import('@/features/shadow/Shadow'));
const ExamHub = lazy(() => import('@/features/exams/ExamHub'));
const IeltsExam = lazy(() => import('@/features/exams/IeltsExam'));
const SatExam = lazy(() => import('@/features/exams/SatExam'));
const Report = lazy(() => import('@/features/exams/Report'));

/** Пока нет профиля (онбординг не пройден) — отправляем на экран старта. */
function RequireProfile() {
  const profile = useProgress((s) => s.profile);
  return profile ? <Outlet /> : <Navigate to="/start" replace />;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="start" element={<Start />} />
          <Route path="settings" element={<Settings />} />
          <Route path="sources" element={<Sources />} />
          <Route element={<RequireProfile />}>
            <Route path="home" element={<Home />} />
            <Route path="diag" element={<Diagnostic />} />
            <Route path="path" element={<Path />} />
            <Route path="lesson/:id" element={<LessonPage />} />
            <Route path="practice" element={<Practice />} />
            <Route path="vocab" element={<VocabHub />} />
            <Route path="vocab/new" element={<NewWords />} />
            <Route path="vocab/review/:any?" element={<SrsReview />} />
            <Route path="vocab/mode/:mode" element={<WordMode />} />
            <Route path="vocab/list" element={<WordList />} />
            <Route path="books" element={<Books />} />
            <Route path="hw/:mode/:id" element={<Homework />} />
            <Route path="reader" element={<ReaderLibrary />} />
            <Route path="reader/:id" element={<Reader />} />
            <Route path="review/:src?" element={<MistakeReview />} />
            <Route path="journal" element={<Journal />} />
            <Route path="journal/train" element={<JournalTrain />} />
            <Route path="quick" element={<QuickTest />} />
            <Route path="writing" element={<WritingList />} />
            <Route path="write/:id" element={<WriteTask />} />
            <Route path="speaking" element={<Speaking />} />
            <Route path="shadow/:id?/:mode?" element={<Shadow />} />
            <Route path="exam" element={<ExamHub />} />
            <Route path="exam/ielts/:mode" element={<IeltsExam />} />
            <Route path="exam/sat/:mode" element={<SatExam />} />
            <Route path="report/:id" element={<Report />} />
            <Route path="dash" element={<Dash />} />
            <Route path="me" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
