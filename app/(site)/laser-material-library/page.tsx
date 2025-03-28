import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { EmailSubscriptionForm } from "@/components/email-subscription-form";

export const metadata: Metadata = {
  title: "Laser Material Library | Machines for Makers",
  description: "Access our comprehensive library of laser settings for cutting and engraving various materials.",
};

export default function LaserMaterialLibraryPage() {
  return (
    <div className="relative overflow-hidden bg-background pb-20">
      {/* Hero Section */}
      <div className="relative pt-10 pb-20 md:pt-16 md:pb-24">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Laser Settings Material Library
            </h1>
            <p className="mt-6 text-xl text-muted-foreground">
              The ultimate collection of laser cutting and engraving settings for perfect results every time.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button size="lg">
                Explore Library
              </Button>
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </div>
          </div>
        </Container>
      </div>

      {/* Features Section */}
      <Container className="py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-xl font-semibold">Tested Settings</h3>
              <p className="mt-2 text-muted-foreground">
                All settings are thoroughly tested on popular laser cutters to ensure consistent results.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-xl font-semibold">Diverse Materials</h3>
              <p className="mt-2 text-muted-foreground">
                From wood to acrylic, metals to fabrics - find settings for all your materials.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-xl font-semibold">Regular Updates</h3>
              <p className="mt-2 text-muted-foreground">
                Our library grows with new materials and machine-specific settings every month.
              </p>
            </CardContent>
          </Card>
        </div>
      </Container>

      {/* Email Subscription */}
      <Container className="py-12">
        <div className="rounded-lg bg-muted p-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold">Get Early Access</h2>
            <p className="mt-2 text-muted-foreground">
              Sign up to receive access to our comprehensive laser settings library when it launches.
            </p>
            <div className="mt-6">
              <EmailSubscriptionForm />
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
} 