import "./styles/tailwind.css";
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
//import './index.css'
import App from './App.tsx'

// iOS 주소창 변동 대응: 현재 보이는 뷰포트 높이를 CSS 변수로 노출
function mountViewportFix() {
  const set = () => {
    const vv = window.visualViewport;
    const h = vv?.height ?? window.innerHeight;
    document.documentElement.style.setProperty("--vvh", `${h}px`);
  };
  set();
  window.visualViewport?.addEventListener("resize", set);
  window.visualViewport?.addEventListener("scroll", set);
}
mountViewportFix();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
