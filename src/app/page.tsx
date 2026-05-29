import { CalendarClock, MapPin, Receipt, Repeat, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import ServicePageLink from "@/components/links/service-page-link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    icon: Users,
    title: "Client Management",
    description:
      "Keep every customer, address, and note organized in one tidy place.",
    href: "/client-info-list",
  },
  {
    icon: MapPin,
    title: "Smart Route Planning",
    description:
      "Map your daily stops and cut down on drive time between lawns.",
    href: "/clients-service",
  },
  {
    icon: Repeat,
    title: "Client Info",
    description:
      "Browse and update every client's details whenever you need them.",
    href: "/client-info-list",
  },
  {
    icon: CalendarClock,
    title: "Daily Service Routes",
    description:
      "See exactly what needs mowing today, sorted and ready to go.",
    href: "/clients-service",
  },
  {
    icon: Receipt,
    title: "Invoices Made Easy",
    description:
      "Generate clean invoices for completed work without the paperwork.",
    href: "/pricing",
  },
];

export default function Home(props: PageProps<"/">) {
  const datePromise = props.searchParams.then((p) =>
    String(Array.isArray(p.date) ? p.date[0] : (p.date ?? "")),
  );

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero */}
      <section className="relative w-full overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/checkered-lawn.png"
            alt="A freshly mowed lawn with a classic checkered stripe pattern"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/10 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-start gap-6 px-6 py-24 md:py-36">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary ring-1 ring-primary/20 backdrop-blur-sm">
            Lawn care, made simple
          </span>
          <h1 className="max-w-3xl text-balance text-5xl font-extrabold tracking-tight text-foreground md:text-7xl">
            Run your landscaping business from one clean dashboard
          </h1>
          <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Manage clients, plan your daily routes, and schedule repeat cuts
            with total control. Landscape Friend handles the busywork so you can
            focus on the lawns.
          </p>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Link
              href="/client-info-list"
              className={buttonVariants({
                size: "lg",
                className:
                  "h-13 rounded-full px-8 text-base shadow-lg transition-all hover:shadow-xl",
              })}
            >
              <Users className="mr-2 h-5 w-5" />
              Manage Clients
            </Link>
            <Suspense>
              <ServicePageLink datePromise={datePromise} />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Everything you need to keep the season running
          </h2>
          <p className="mt-3 text-pretty text-muted-foreground">
            A focused set of tools built for the day-to-day reality of lawn
            care professionals.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Card className="h-full transition-all group-hover:-translate-y-1 group-hover:ring-primary/30 group-hover:shadow-lg">
                <CardHeader>
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription className="leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
