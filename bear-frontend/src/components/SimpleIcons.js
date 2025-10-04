// Simple icon replacements using Unicode symbols
// This can be used as a fallback if Material-UI icons cause issues

export const LoginIcon = () => "🔐";
export const Email = () => "📧";
export const Lock = () => "🔒";
export const Visibility = () => "👁️";
export const VisibilityOff = () => "🙈";
export const DashboardIcon = () => "📊";
export const Emergency = () => "🚨";
export const People = () => "👥";
export const Settings = () => "⚙️";
export const AccountCircle = () => "👤";
export const ExitToApp = () => "🚪";
export const ArrowBack = () => "⬅️";
export const Refresh = () => "🔄";

// Usage example:
// import { LoginIcon, Email, Lock } from './components/SimpleIcons';
// 
// Then use like:
// <Button startIcon={<span>{LoginIcon()}</span>}>Sign In</Button>
// <InputAdornment position="start"><span>{Email()}</span></InputAdornment>
