import './App.css'

type Category = {
  id: string
  name: string
  blurb: string
}

const CATEGORIES: Category[] = [
  {
    id: 'demographic',
    name: 'Demographic',
    blurb: 'Population, density, and composition by geography.',
  },
  {
    id: 'fire',
    name: 'Fire',
    blurb: 'Incidents and causes, from the Bureau of Fire Investigations.',
  },
  {
    id: 'medical',
    name: 'Medical',
    blurb: 'Emergency medical response and public health indicators.',
  },
]

function CategoryCard({ name, blurb }: Category) {
  return (
    <li className="category">
      <span className="category-name">{name}</span>
      <span className="category-blurb">{blurb}</span>
    </li>
  )
}

export default function App() {
  return (
    <main className="page">
      <span className="tag">In development</span>
      <h1 className="title">NYC Data</h1>
      <p className="lede">
        Interactive maps and visualizations of New York City open data &mdash;
        navigable from the borough level down to individual police precincts.
      </p>

      <h2 className="section-label">Planned coverage</h2>
      <ul className="categories">
        {CATEGORIES.map((category) => (
          <CategoryCard key={category.id} {...category} />
        ))}
      </ul>

      <footer className="footer">
        Source:{' '}
        <a href="https://github.com/nomotonyc/nyc-data-general">
          nomotonyc/nyc-data-general
        </a>
        . Data from{' '}
        <a href="https://data.cityofnewyork.us/">NYC Open Data</a>.
      </footer>
    </main>
  )
}
