import { useEffect } from "react";
import { motion } from "framer-motion";
import { Home, ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate("/"), 8000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/[0.06] blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-lg text-center space-y-8"
      >
        <motion.div
          animate={{ rotate: [0, 15, -15, 10, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
          className="mx-auto w-24 h-24 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center"
        >
          <Compass className="w-12 h-12 text-primary" />
        </motion.div>

        <div className="space-y-3">
          <h1 className="text-5xl md:text-6xl font-display font-black text-foreground">
            Page Not Found
          </h1>
          <p className="text-lg text-muted-foreground max-w-sm mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            size="lg"
            onClick={() => navigate("/")}
            className="bg-gradient-primary text-primary-foreground font-semibold btn-press hover:shadow-glow transition-shadow w-full sm:w-auto"
          >
            <Home className="w-4 h-4 mr-2" />
            Go to Homepage
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>

        <p className="text-xs text-muted-foreground/60">
          You'll be redirected to the homepage shortly.
        </p>
      </motion.div>
    </div>
  );
}
