import { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../contexts/AuthContext';
import { motion as Motion } from 'framer-motion';
import { TrendingUp, User, Mail, Lock, ArrowRight, Loader2, AlertCircle, CheckCircle, Sparkles, Cpu, Eye, EyeOff } from 'lucide-react';
import { GlassButton, BlurFade } from '../components/ui/sign-up.tsx';
import HolographicCard from '../components/ui/holographic-card';

const StaticBackground = () => (
    <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.12)_0%,_transparent_40%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] opacity-20" />
    </div>
);

const RegisterPage = () => {
    const { register, error: authError } = useContext(AuthContext);
    const navigate = useNavigate();

    const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
    const [localError, setLocalError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Explicitly reset form data on mount to fight browser autofill
    useEffect(() => {
        setFormData({ name: '', email: '', password: '', confirmPassword: '' });
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');
        setSuccessMessage('');

        if (formData.password !== formData.confirmPassword) {
            setLocalError("Passwords don't match");
            return;
        }

        if (formData.password.length < 6) {
            setLocalError("Password must be at least 6 characters");
            return;
        }

        setIsLoading(true);

        try {
            const data = await register(formData.name, formData.email, formData.password);

            if (data?.session) {
                // Auto-login successful
                navigate('/setup');
            } else if (data?.user) {
                // User created, verification required
                setSuccessMessage('Account created! Please check your email to verify your account.');
                setFormData({ name: '', email: '', password: '', confirmPassword: '' });
            }
        } catch (err) {
            console.error("Registration failed", err);
            setLocalError(err.message || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#030303] text-white flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-indigo-500/30">
            <StaticBackground />
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none" />

            <Motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-md relative z-10"
            >
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />

                {/* Brand */}
                <BlurFade delay={0.1}>
                    <div className="flex justify-center mb-8 relative z-10">
                        <div
                            className="flex items-center gap-3 px-6 py-3 bg-black/60 border border-white/10 rounded-full backdrop-blur-xl cursor-pointer group hover:border-indigo-500/50 transition-all shadow-xl shadow-black/50"
                            onClick={() => navigate('/')}
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-indigo-500 blur-md opacity-50 group-hover:opacity-100 transition-opacity" />
                                <div className="relative bg-gradient-to-br from-indigo-500 to-violet-600 p-1.5 rounded-full text-white">
                                    <TrendingUp className="w-4 h-4" />
                                </div>
                            </div>
                            <span className="font-bold text-lg tracking-tight text-white">Cashly</span>
                        </div>
                    </div>
                </BlurFade>

                {/* Card */}
                <BlurFade delay={0.2}>
                    <HolographicCard className="p-0 border-0 bg-transparent shadow-2xl relative z-10">
                        <div className="p-10 bg-[#0A0A0B]/90 backdrop-blur-2xl rounded-[32px] h-full w-full border border-white/10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] relative overflow-hidden ring-1 ring-white/5">
                            {/* Shimmer Effect */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                            <div className="text-center mb-10">
                                <h1 className="text-4xl font-bold mb-3 tracking-tight text-white drop-shadow-sm">Create Account</h1>
                                <p className="text-indigo-200/60 text-[10px] font-black uppercase tracking-[0.3em]">Join the future of cash flow</p>
                            </div>

                            {(localError || authError) && (
                                <Motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-8 flex items-center gap-3 text-red-500 text-sm font-medium shadow-inner"
                                >
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    <span>{localError || 'Registration failed. Please check your inputs.'}</span>
                                </Motion.div>
                            )}

                            {successMessage && (
                                <Motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 mb-8 flex items-center gap-3 text-emerald-400 text-sm font-medium shadow-inner"
                                >
                                    <CheckCircle className="w-5 h-5 shrink-0" />
                                    <span>{successMessage}</span>
                                </Motion.div>
                            )}

                            {/* Aggressive anti-autofill approach */}
                            <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
                                {/* Hidden dummy inputs to capture initial browser autofill */}
                                <input type="text" style={{ display: 'none' }} name="prevent_autofill" />
                                <input type="password" style={{ display: 'none' }} name="prevent_autofill_pass" />

                                {/* Name Field */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Full Name</label>
                                    </div>
                                    <div className="relative group/input">
                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/5 text-white/40 group-focus-within/input:text-indigo-400 group-focus-within/input:bg-indigo-500/10 group-focus-within/input:border-indigo-500/30 transition-all">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="text"
                                            name="user_full_name_v2"
                                            id="user_full_name_v2"
                                            required
                                            autoComplete="off"
                                            className="w-full bg-black/60 border border-white/10 rounded-2xl py-4 pl-20 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-black/80 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm font-semibold shadow-inner"
                                            placeholder="John Doe"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Email Field */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Email Address</label>
                                    </div>
                                    <div className="relative group/input">
                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/5 text-white/40 group-focus-within/input:text-indigo-400 group-focus-within/input:bg-indigo-500/10 group-focus-within/input:border-indigo-500/30 transition-all">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="email"
                                            name="user_email_v2"
                                            id="user_email_v2"
                                            required
                                            autoComplete="new-password"
                                            className="w-full bg-black/60 border border-white/10 rounded-2xl py-4 pl-20 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-black/80 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm font-semibold shadow-inner"
                                            placeholder="name@company.com"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Password Field */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Password</label>
                                    </div>
                                    <div className="relative group/input">
                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/5 text-white/40 group-focus-within/input:text-indigo-400 group-focus-within/input:bg-indigo-500/10 group-focus-within/input:border-indigo-500/30 transition-all">
                                            <Lock className="w-5 h-5" />
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="user_password_v2"
                                            id="user_password_v2"
                                            required
                                            autoComplete="new-password"
                                            className="w-full bg-black/60 border border-white/10 rounded-2xl py-4 pl-20 pr-14 text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-black/80 focus:ring-1 focus:ring-indigo-500/50 transition-all font-sans text-sm font-semibold shadow-inner"
                                            placeholder="••••••••••••"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors focus:outline-none z-10 cursor-pointer p-2 hover:bg-white/10 rounded-lg active:scale-90"
                                        >
                                            {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm Password Field */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Confirm Password</label>
                                    </div>
                                    <div className="relative group/input">
                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/5 text-white/40 group-focus-within/input:text-indigo-400 group-focus-within/input:bg-indigo-500/10 group-focus-within/input:border-indigo-500/30 transition-all">
                                            <CheckCircle className="w-5 h-5" />
                                        </div>
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            name="user_confirm_password_v2"
                                            id="user_confirm_password_v2"
                                            required
                                            autoComplete="new-password"
                                            className="w-full bg-black/60 border border-white/10 rounded-2xl py-4 pl-20 pr-14 text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-black/80 focus:ring-1 focus:ring-indigo-500/50 transition-all font-sans text-sm font-semibold shadow-inner"
                                            placeholder="••••••••••••"
                                            value={formData.confirmPassword}
                                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors focus:outline-none z-10 cursor-pointer p-2 hover:bg-white/10 rounded-lg active:scale-90"
                                        >
                                            {showConfirmPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                <GlassButton
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-lg shadow-[0_10px_40px_-5px_rgba(79,70,229,0.5)] transition-all hover:scale-[1.02] active:scale-[0.98] mt-6 rounded-2xl border border-white/10"
                                >
                                    {isLoading ? (
                                        <div className="flex items-center gap-3">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Creating Account...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center gap-3">
                                            Sign Up <ArrowRight className="w-5 h-5" />
                                        </div>
                                    )}
                                </GlassButton>
                            </form>

                            <div className="mt-10 pt-8 border-t border-white/5 text-center">
                                <p className="text-white/30 text-xs font-medium tracking-wide">
                                    Already have an account?{' '}
                                    <Link to="/login" className="text-white hover:text-indigo-400 font-bold transition-all underline underline-offset-4 decoration-indigo-500/30">
                                        Sign in
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </HolographicCard>
                </BlurFade>

                <BlurFade delay={0.4}>
                    <div className="flex items-center justify-center gap-4 mt-8 opacity-20">
                        <div className="flex items-center gap-1 text-[10px] font-mono"><Cpu className="w-3 h-3" /> SECURE_REGISTER</div>
                        <div className="h-1 w-1 rounded-full bg-white/50" />
                        <div className="flex items-center gap-1 text-[10px] font-mono"><Sparkles className="w-3 h-3" /> ENCRYPTED</div>
                    </div>
                </BlurFade>
            </Motion.div>
        </div>
    );
};

export default RegisterPage;
