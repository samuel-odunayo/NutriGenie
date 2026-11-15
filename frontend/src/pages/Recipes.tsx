import { useEffect, useMemo, useState } from 'react';
import { fetchDishes, type Dish } from '../api';
import { PageHeader } from '../components/Layout';
import { DishCard } from '../components/DishCard';
import { Badge, Loading } from '../components/ui';
import { href } from '../router';

const CATEGORIES = ['All', 'Breakfast', 'Lunch', 'Dinner'];

export function RecipesPage() {
  const [dishes, setDishes] = useState<Dish[] | null>(null);
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchDishes().then(setDishes);
  }, []);

  const visible = useMemo(() => {
    if (!dishes) return [];
    const q = query.trim().toLowerCase();
    return dishes.filter(
      (d) =>
        (category === 'All' || d.category === category) &&
        (!q || d.name.toLowerCase().includes(q) || (d.staple_crops ?? '').toLowerCase().includes(q)),
    );
  }, [dishes, category, query]);

  return (
    <>
      <PageHeader
        eyebrow="Recipes"
        title="Local recipes"
        description="Nutritious dishes made from ingredients available in local markets."
      />
      <div className="container-page py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2" role="tablist">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={category === c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  category === c ? 'bg-brand text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by dish or ingredient"
            className="input sm:max-w-xs"
            aria-label="Search recipes"
          />
        </div>

        {!dishes ? (
          <Loading />
        ) : visible.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">No recipes match your search.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((d) => (
              <DishCard key={d.id} dish={d} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function RecipeDetailPage({ id }: { id?: string }) {
  const [dishes, setDishes] = useState<Dish[] | null>(null);

  useEffect(() => {
    fetchDishes().then(setDishes);
  }, []);

  if (!dishes) return <Loading />;
  const dish = dishes.find((d) => String(d.id) === id);

  if (!dish) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-2xl font-semibold">Recipe not found</h1>
        <a href={href('recipes')} className="btn-primary mt-6">Back to recipes</a>
      </div>
    );
  }

  const ingredients = (dish.ingredients ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const others = dishes.filter((d) => d.id !== dish.id).slice(0, 3);

  return (
    <div className="container-page py-8">
      <a href={href('recipes')} className="text-sm font-medium text-brand hover:underline">Back to recipes</a>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl bg-slate-100">
          {dish.image_url && <img src={dish.image_url} alt={dish.name} className="aspect-[4/3] h-full w-full object-cover" />}
        </div>

        <div>
          <p className="eyebrow">{dish.category}</p>
          <h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">{dish.name}</h1>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge>{dish.cooking_time_mins} minutes</Badge>
            {dish.iron_mg >= 6 && <Badge tone="success">High in iron</Badge>}
            {dish.vitamin_a_ug >= 400 && <Badge tone="success">High in vitamin A</Badge>}
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              ['Energy', `${dish.calories} kcal`],
              ['Protein', `${dish.protein_g} g`],
              ['Carbohydrate', `${dish.carbs_g} g`],
              ['Fat', `${dish.fat_g} g`],
              ['Iron', `${dish.iron_mg} mg`],
              ['Vitamin A', `${dish.vitamin_a_ug} µg`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-slate-200 p-4">
                <dt className="text-xs text-slate-500">{k}</dt>
                <dd className="mt-1 text-lg font-semibold">{v}</dd>
              </div>
            ))}
          </dl>

          {ingredients.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold">Ingredients</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {ingredients.map((i) => (
                  <li key={i} className="rounded-md bg-slate-50 px-3 py-2 text-sm capitalize text-slate-700">{i}</li>
                ))}
              </ul>
            </div>
          )}

          {dish.staple_crops && (
            <p className="mt-6 text-sm text-slate-600">
              Main local crops: <span className="font-medium text-slate-800">{dish.staple_crops}</span>. Available at nearby
              markets on the <a href={href('map')} className="font-medium text-brand hover:underline">health map</a>.
            </p>
          )}
        </div>
      </div>

      {others.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 text-lg font-semibold">More recipes</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((d) => (
              <DishCard key={d.id} dish={d} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
