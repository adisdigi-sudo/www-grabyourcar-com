import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Car,
  Fuel,
  Cog,
  Users,
  Target,
  Wallet,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface QuizAnswers {
  budget: string;
  primaryUse: string;
  fuelPreference: string;
  transmissionPreference: string;
  seatingCapacity: string;
  topPriorities: string[];
  bodyTypePreference: string;
}

interface CarRecommendation {
  rank: number;
  name: string;
  brand: string;
  slug: string;
  price: string;
  matchScore: number;
  matchReasons: string[];
  highlights: string[];
}

interface QuizResults {
  recommendations: CarRecommendation[];
  summary: string;
}

const quizSteps = [
  {
    id: "budget",
    title: "What's your budget?",
    subtitle: "Select your comfortable price range",
    icon: Wallet,
    options: [
      { value: "under-5-lakh", label: "Under ₹5 Lakh", description: "Entry-level cars" },
      { value: "5-10-lakh", label: "₹5 - 10 Lakh", description: "Budget-friendly options" },
      { value: "10-15-lakh", label: "₹10 - 15 Lakh", description: "Mid-range segment" },
      { value: "15-20-lakh", label: "₹15 - 20 Lakh", description: "Premium segment" },
      { value: "20-30-lakh", label: "₹20 - 30 Lakh", description: "Luxury segment" },
      { value: "above-30-lakh", label: "Above ₹30 Lakh", description: "Ultra-premium" },
    ],
  },
  {
    id: "primaryUse",
    title: "How will you primarily use this car?",
    subtitle: "This helps us find the perfect match",
    icon: Target,
    options: [
      { value: "daily-commute", label: "Daily Commute", description: "City driving & office travel" },
      { value: "family-outings", label: "Family Outings", description: "Weekend trips & family use" },
      { value: "long-trips", label: "Long Distance Travel", description: "Highway drives & road trips" },
      { value: "off-road", label: "Off-Road Adventures", description: "Rough terrain & adventure" },
      { value: "luxury-comfort", label: "Luxury & Comfort", description: "Premium driving experience" },
      { value: "first-car", label: "First Car", description: "Easy to drive & maintain" },
    ],
  },
  {
    id: "fuelPreference",
    title: "What's your fuel preference?",
    subtitle: "Consider running costs and availability",
    icon: Fuel,
    options: [
      { value: "petrol", label: "Petrol", description: "Most popular choice" },
      { value: "diesel", label: "Diesel", description: "Better for long distances" },
      { value: "cng", label: "CNG", description: "Low running costs" },
      { value: "electric", label: "Electric", description: "Eco-friendly & modern" },
      { value: "hybrid", label: "Hybrid", description: "Best of both worlds" },
      { value: "no-preference", label: "No Preference", description: "Open to all options" },
    ],
  },
  {
    id: "transmissionPreference",
    title: "Transmission preference?",
    subtitle: "Manual gives control, automatic offers convenience",
    icon: Cog,
    options: [
      { value: "manual", label: "Manual", description: "Full control & engagement" },
      { value: "automatic", label: "Automatic", description: "Easy city driving" },
      { value: "no-preference", label: "No Preference", description: "Either works for me" },
    ],
  },
  {
    id: "seatingCapacity",
    title: "How many seats do you need?",
    subtitle: "Consider your regular passengers",
    icon: Users,
    options: [
      { value: "4-5", label: "4-5 Seater", description: "Standard for small families" },
      { value: "6-7", label: "6-7 Seater", description: "For larger families" },
      { value: "7-plus", label: "7+ Seater", description: "Maximum space needed" },
    ],
  },
  {
    id: "bodyTypePreference",
    title: "Which body type appeals to you?",
    subtitle: "Each has its own advantages",
    icon: Car,
    options: [
      { value: "hatchback", label: "Hatchback", description: "Compact & maneuverable" },
      { value: "sedan", label: "Sedan", description: "Elegant & spacious boot" },
      { value: "suv", label: "SUV", description: "Commanding presence" },
      { value: "mpv", label: "MPV", description: "Maximum family space" },
      { value: "no-preference", label: "No Preference", description: "Open to suggestions" },
    ],
  },
  {
    id: "topPriorities",
    title: "What matters most to you?",
    subtitle: "Select up to 3 priorities",
    icon: CheckCircle2,
    multiSelect: true,
    maxSelections: 3,
    options: [
      { value: "fuel-efficiency", label: "Fuel Efficiency", description: "Low running costs" },
      { value: "safety", label: "Safety Features", description: "Airbags, ABS, etc." },
      { value: "comfort", label: "Comfort & Space", description: "Plush interiors" },
      { value: "performance", label: "Performance", description: "Power & handling" },
      { value: "technology", label: "Technology", description: "Infotainment & features" },
      { value: "resale-value", label: "Resale Value", description: "Future returns" },
      { value: "brand-reputation", label: "Brand Reputation", description: "Trusted names" },
      { value: "low-maintenance", label: "Low Maintenance", description: "Affordable upkeep" },
    ],
  },
];

const CarFinder = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({
    topPriorities: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<QuizResults | null>(null);
  const [showQuiz, setShowQuiz] = useState(true);

  const progress = ((currentStep + 1) / quizSteps.length) * 100;
  const currentQuestion = quizSteps[currentStep];

  const handleSelect = (value: string) => {
    if (currentQuestion.multiSelect) {
      const currentSelections = (answers.topPriorities as string[]) || [];
      const maxSelections = currentQuestion.maxSelections || 3;

      if (currentSelections.includes(value)) {
        setAnswers({
          ...answers,
          topPriorities: currentSelections.filter((v) => v !== value),
        });
      } else if (currentSelections.length < maxSelections) {
        setAnswers({
          ...answers,
          topPriorities: [...currentSelections, value],
        });
      }
    } else {
      setAnswers({
        ...answers,
        [currentQuestion.id]: value,
      });

      // Auto-advance to next question
      if (currentStep < quizSteps.length - 1) {
        setTimeout(() => setCurrentStep(currentStep + 1), 300);
      }
    }
  };

  const isSelected = (value: string) => {
    if (currentQuestion.multiSelect) {
      return (answers.topPriorities as string[])?.includes(value);
    }
    return answers[currentQuestion.id as keyof QuizAnswers] === value;
  };

  const canProceed = () => {
    if (currentQuestion.multiSelect) {
      return (answers.topPriorities as string[])?.length > 0;
    }
    return !!answers[currentQuestion.id as keyof QuizAnswers];
  };

  const handleNext = () => {
    if (currentStep < quizSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      submitQuiz();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const submitQuiz = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/car-finder`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(answers),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get recommendations");
      }

      const data = await response.json();
      setResults(data);
      setShowQuiz(false);
    } catch (error) {
      console.error("Error getting recommendations:", error);
      toast.error("Failed to get recommendations. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const restartQuiz = () => {
    setCurrentStep(0);
    setAnswers({ topPriorities: [] });
    setResults(null);
    setShowQuiz(true);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-success";
    if (score >= 75) return "text-primary";
    if (score >= 60) return "text-accent";
    return "text-muted-foreground";
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Car Finder Quiz | GrabYourCar - Find Your Perfect Car</title>
        <meta
          name="description"
          content="Answer a few questions and let our AI find your perfect car match based on your budget, preferences, and lifestyle."
        />
      </Helmet>

      <Header />

      <main className="pt-20 pb-24 md:pb-12">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 via-background to-accent/5 py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto">
              <Badge variant="secondary" className="mb-4">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                AI-Powered
              </Badge>
              <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                Find Your Perfect Car
              </h1>
              <p className="text-lg text-muted-foreground">
                Answer a few quick questions and our AI will recommend the best cars
                tailored to your needs and preferences.
              </p>
            </div>
          </div>
        </section>

        {/* Quiz Section */}
        <section className="py-8 md:py-12">
          <div className="container mx-auto px-4">
            {showQuiz ? (
              <div className="max-w-3xl mx-auto">
                {/* Progress Bar */}
                <div className="mb-8">
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>Question {currentStep + 1} of {quizSteps.length}</span>
                    <span>{Math.round(progress)}% Complete</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                {/* Question Card */}
                <Card className="border-2 border-primary/20">
                  <CardContent className="p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <currentQuestion.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-xl md:text-2xl font-bold text-foreground">
                          {currentQuestion.title}
                        </h2>
                        <p className="text-muted-foreground">{currentQuestion.subtitle}</p>
                      </div>
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                      {currentQuestion.options.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleSelect(option.value)}
                          className={cn(
                            "p-4 rounded-xl border-2 text-left transition-all duration-200",
                            isSelected(option.value)
                              ? "border-primary bg-primary/10 shadow-md"
                              : "border-border hover:border-primary/50 hover:bg-secondary/50"
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-foreground">{option.label}</p>
                              <p className="text-sm text-muted-foreground">{option.description}</p>
                            </div>
                            {isSelected(option.value) && (
                              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between items-center">
                      <Button
                        variant="ghost"
                        onClick={handleBack}
                        disabled={currentStep === 0}
                        className="gap-2"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                      </Button>

                      {currentQuestion.multiSelect && (
                        <span className="text-sm text-muted-foreground">
                          {(answers.topPriorities as string[])?.length || 0} / {currentQuestion.maxSelections} selected
                        </span>
                      )}

                      <Button
                        onClick={handleNext}
                        disabled={!canProceed() || isLoading}
                        className="gap-2"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Finding Cars...
                          </>
                        ) : currentStep === quizSteps.length - 1 ? (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Get Recommendations
                          </>
                        ) : (
                          <>
                            Next
                            <ChevronRight className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              /* Results Section */
              <div className="max-w-4xl mx-auto">
                {/* Summary Card */}
                <Card className="mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                  <CardContent className="p-6 md:p-8">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-xl font-bold text-foreground mb-2">
                          Your Personalized Recommendations
                        </h2>
                        <p className="text-muted-foreground">{results?.summary}</p>
                      </div>
                      <Button variant="outline" onClick={restartQuiz} className="gap-2 flex-shrink-0">
                        <RotateCcw className="h-4 w-4" />
                        Start Over
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Recommendations List */}
                <div className="space-y-4">
                  {results?.recommendations.map((car, index) => (
                    <Card
                      key={index}
                      className="group hover:shadow-lg hover:border-primary/30 transition-all duration-300"
                    >
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          {/* Rank Badge */}
                          <div className="flex items-center gap-4">
                            <div
                              className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg",
                                car.rank === 1
                                  ? "bg-primary text-primary-foreground"
                                  : car.rank === 2
                                  ? "bg-accent text-accent-foreground"
                                  : "bg-secondary text-secondary-foreground"
                              )}
                            >
                              #{car.rank}
                            </div>
                            <div className="md:hidden">
                              <h3 className="font-bold text-lg text-foreground">{car.name}</h3>
                              <p className="text-primary font-semibold">{car.price}</p>
                            </div>
                          </div>

                          {/* Car Details */}
                          <div className="flex-1">
                            <div className="hidden md:block">
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-bold text-xl text-foreground">{car.name}</h3>
                                <Badge variant="secondary">{car.brand}</Badge>
                              </div>
                              <p className="text-primary font-semibold text-lg mb-2">{car.price}</p>
                            </div>

                            {/* Match Reasons */}
                            <div className="flex flex-wrap gap-2 mb-3">
                              {car.matchReasons.map((reason, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  {reason}
                                </Badge>
                              ))}
                            </div>

                            {/* Highlights */}
                            <div className="flex flex-wrap gap-2">
                              {car.highlights.map((highlight, i) => (
                                <span
                                  key={i}
                                  className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded"
                                >
                                  {highlight}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Match Score & CTA */}
                          <div className="flex md:flex-col items-center gap-4 md:gap-2">
                            <div className="text-center">
                              <p className={cn("text-3xl font-bold", getScoreColor(car.matchScore))}>
                                {car.matchScore}%
                              </p>
                              <p className="text-xs text-muted-foreground">Match</p>
                            </div>
                            <Link to={`/car/${car.slug}`} className="flex-1 md:flex-none">
                              <Button className="w-full gap-2 group-hover:bg-primary">
                                View Details
                                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Browse All CTA */}
                <div className="text-center mt-8">
                  <p className="text-muted-foreground mb-4">
                    Want to explore more options?
                  </p>
                  <Link to="/cars">
                    <Button variant="outline" size="lg" className="gap-2">
                      <Car className="h-5 w-5" />
                      Browse All Cars
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default CarFinder;
