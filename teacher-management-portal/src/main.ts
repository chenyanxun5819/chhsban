import "./styles.css";
import { App } from "./app";

// 應用啟動
const app = new App();
app.initialize();

// 將應用實例暴露到全局作用域供 HTML 事件使用
(window as any).app = app;
