import type { Dish } from '../api';
import { href } from '../router';

export function dishSlug(d: Dish) {
  return String(d.id);
}

export function DishCard({ dish, label }: { dish: Dish; label?: string }) {
  return (
    <a
      href={href(`recipes/${dishSlug(dish)}`)}
      className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-md"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {dish.image_url && (
          <img
            src={dish.image_url}
            alt={dish.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="eyebrow">{label ?? dish.category}</p>
        <h3 className="mt-1 font-semibold text-slate-900">{dish.name}</h3>
        <dl className="mt-auto grid grid-cols-3 gap-2 pt-4 text-xs text-slate-500">
          <div>
            <dt>Energy</dt>
            <dd className="font-semibold text-slate-800">{dish.calories} kcal</dd>
          </div>
          <div>
            <dt>Protein</dt>
            <dd className="font-semibold text-slate-800">{dish.protein_g} g</dd>
          </div>
          <div>
            <dt>Iron</dt>
            <dd className="font-semibold text-slate-800">{dish.iron_mg} mg</dd>
          </div>
        </dl>
      </div>
    </a>
  );
}
