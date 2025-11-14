import brotoLogo from "@/assets/brototype-logo.png";

export const BrotoLogo = () => {
  return (
    <div className="flex flex-col items-center gap-2">
      <h1 className="text-5xl md:text-6xl font-black tracking-tight bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">
        BROTOHELP
      </h1>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">by</span>
        <img src={brotoLogo} alt="Brototype" className="h-6" />
      </div>
    </div>
  );
};
