import Link from 'next/link';

const plans = [
  { name: 'Free', monthly: '$0', yearly: '$0', features: ['Basic usage'] },
  { name: 'Pro', monthly: '$19', yearly: '$190', features: ['Analytics', 'Export'] },
  { name: 'Enterprise', monthly: 'Contact', yearly: 'Contact', features: ['Overage billing', 'Priority support'] },
];

export default function PricingPage() {
  return (
    <main className="container-page space-y-6">
      <header className="flex justify-between">
        <h1 className="text-2xl font-semibold">Pricing</h1>
        <div className="flex gap-2">
          <Link className="rounded border px-3 py-1" href="/login">Login</Link>
          <Link className="rounded bg-black px-3 py-1 text-white" href="/signup">Sign Up</Link>
        </div>
      </header>
      <section className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <article className="card space-y-2" key={plan.name}>
            <h2 className="text-xl font-medium">{plan.name}</h2>
            <p className="text-sm text-gray-600">Monthly: {plan.monthly} / Yearly: {plan.yearly}</p>
            <ul className="list-inside list-disc text-sm">
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}
