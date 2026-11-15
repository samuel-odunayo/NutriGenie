import { Layout } from './components/Layout';
import { AccountPage } from './pages/Account';
import { CarePage } from './pages/Care';
import { DashboardPage } from './pages/Dashboard';
import { HomePage } from './pages/Home';
import { LearnPage } from './pages/Learn';
import { MapPage } from './pages/Map';
import { MealPlanPage } from './pages/MealPlan';
import { RecipeDetailPage, RecipesPage } from './pages/Recipes';
import { TrackerPage } from './pages/Tracker';
import { useRoute } from './router';
import { AppProvider } from './state';

function Page() {
  const route = useRoute();

  const content = (() => {
    switch (route.key) {
      case 'dashboard':
        return <DashboardPage />;
      case 'meal-plan':
        return <MealPlanPage />;
      case 'recipes':
        return <RecipesPage />;
      case 'recipe':
        return <RecipeDetailPage id={route.param} />;
      case 'tracker':
        return <TrackerPage />;
      case 'map':
        return <MapPage />;
      case 'learn':
        return <LearnPage />;
      case 'care':
        return <CarePage />;
      case 'account':
        return <AccountPage />;
      default:
        return <HomePage />;
    }
  })();

  return <Layout current={route.key}>{content}</Layout>;
}

export default function App() {
  return (
    <AppProvider>
      <Page />
    </AppProvider>
  );
}
