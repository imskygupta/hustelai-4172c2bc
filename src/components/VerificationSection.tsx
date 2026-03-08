import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Shield, Upload, CheckCircle, Clock, XCircle, Camera, CreditCard } from "lucide-react";

export function VerificationSection() {
  const { user, profile, refreshProfile } = useAuth();
  const [verification, setVerification] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  useEffect(() => {
    if (user) loadVerification();
  }, [user]);

  const loadVerification = async () => {
    const { data } = await supabase
      .from("user_verifications")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(1);
    if (data && data.length > 0) setVerification(data[0]);
  };

  const submitVerification = async () => {
    if (!idFile || !photoFile || !user) return;
    if (idFile.size > 5 * 1024 * 1024 || photoFile.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB each", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const idPath = `${user.id}/id_${Date.now()}.${idFile.name.split(".").pop()}`;
      const photoPath = `${user.id}/photo_${Date.now()}.${photoFile.name.split(".").pop()}`;

      const [idRes, photoRes] = await Promise.all([
        supabase.storage.from("kyc-documents").upload(idPath, idFile, { upsert: true }),
        supabase.storage.from("kyc-documents").upload(photoPath, photoFile, { upsert: true }),
      ]);

      if (idRes.error) throw idRes.error;
      if (photoRes.error) throw photoRes.error;

      const { error } = await supabase.from("user_verifications").insert({
        user_id: user.id,
        id_card_url: idPath,
        photo_url: photoPath,
        status: "pending",
      } as any);

      if (error) throw error;

      toast({ title: "Submitted!", description: "Your verification is under review." });
      setIdFile(null);
      setPhotoFile(null);
      loadVerification();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const isVerified = (profile as any)?.is_verified;

  if (isVerified) {
    return (
      <div className="glass rounded-2xl p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold">Identity Verified</h3>
            <Badge className="bg-primary/20 text-primary"><CheckCircle className="w-3 h-3 mr-1" /> Verified</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Your posts are auto-approved in forums.</p>
        </div>
      </div>
    );
  }

  if (verification?.status === "pending") {
    return (
      <div className="glass rounded-2xl p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
          <Clock className="w-6 h-6 text-yellow-500" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold">Verification Pending</h3>
            <Badge className="bg-yellow-500/20 text-yellow-500"><Clock className="w-3 h-3 mr-1" /> Under Review</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Your documents are being reviewed. Usually takes 24-48 hours.</p>
        </div>
      </div>
    );
  }

  if (verification?.status === "rejected") {
    return (
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <XCircle className="w-6 h-6 text-destructive" />
          <div>
            <h3 className="font-display font-bold">Verification Rejected</h3>
            <p className="text-xs text-destructive">{verification.rejection_reason || "Please resubmit with clearer documents."}</p>
          </div>
        </div>
        <UploadForm idFile={idFile} setIdFile={setIdFile} photoFile={photoFile} setPhotoFile={setPhotoFile}
          onSubmit={submitVerification} uploading={uploading} />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      className="glass rounded-2xl p-8 space-y-5">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-xl font-display font-bold">Get Verified</h2>
          <p className="text-xs text-muted-foreground">Verified users can post in forums without admin approval</p>
        </div>
      </div>
      <UploadForm idFile={idFile} setIdFile={setIdFile} photoFile={photoFile} setPhotoFile={setPhotoFile}
        onSubmit={submitVerification} uploading={uploading} />
    </motion.div>
  );
}

function UploadForm({ idFile, setIdFile, photoFile, setPhotoFile, onSubmit, uploading }: any) {
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <label className="cursor-pointer">
          <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${idFile ? "border-primary/50 bg-primary/5" : "border-border/50 hover:border-primary/30"}`}>
            <CreditCard className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">{idFile ? idFile.name : "Upload ID Card"}</p>
            <p className="text-[10px] text-muted-foreground">Aadhaar, PAN, Passport, etc.</p>
          </div>
          <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => setIdFile(e.target.files?.[0] || null)} />
        </label>
        <label className="cursor-pointer">
          <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${photoFile ? "border-primary/50 bg-primary/5" : "border-border/50 hover:border-primary/30"}`}>
            <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">{photoFile ? photoFile.name : "Upload Profile Photo"}</p>
            <p className="text-[10px] text-muted-foreground">Clear face photo</p>
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={e => setPhotoFile(e.target.files?.[0] || null)} />
        </label>
      </div>
      <Button onClick={onSubmit} disabled={!idFile || !photoFile || uploading}
        className="w-full bg-gradient-primary text-primary-foreground">
        <Upload className="w-4 h-4 mr-1" /> {uploading ? "Submitting..." : "Submit for Verification"}
      </Button>
    </div>
  );
}
