import { Badge } from "@/components/ui/badge";
import { Building2, Users, Globe } from "lucide-react";

export const CorporateHero = () => {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      {/* Premium gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      
      {/* Subtle pattern overlay */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Accent glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <Badge 
            variant="outline" 
            className="mb-6 border-primary/30 text-primary bg-primary/10 px-4 py-1.5"
          >
            <Building2 className="h-3.5 w-3.5 mr-2" />
            Enterprise Solutions
          </Badge>

          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Trusted by Leading Organizations{" "}
            <span className="text-primary">Across Industries</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Grabyourcar proudly partners with respected corporate groups, institutions, 
            and enterprises to deliver seamless vehicle solutions tailored to organizational needs.
          </p>

          {/* Trust Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-2xl mx-auto">
            <div className="flex flex-col items-center p-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <span className="text-slate-300 text-sm font-medium text-center">
                Serving Multiple<br />Corporate Clients
              </span>
            </div>

            <div className="flex flex-col items-center p-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <span className="text-slate-300 text-sm font-medium text-center">
                Cross-Industry<br />Partnerships
              </span>
            </div>

            <div className="flex flex-col items-center p-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <span className="text-slate-300 text-sm font-medium text-center">
                Growing Enterprise<br />Network
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
