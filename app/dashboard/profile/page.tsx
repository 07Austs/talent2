import { CandidateProfileForm } from "@/components/candidate-profile-form"

export default function CandidateProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">Update your personal and professional details.</p>
      </div>
      <CandidateProfileForm />
    </div>
  )
}
