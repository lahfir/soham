import { ThemeProvider } from './lib/theme-provider';
import { Dashboard } from './components/Dashboard';
import './App.css';

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="soham-ui-theme">
      <Dashboard />
    </ThemeProvider>
  );
}

export default App;
