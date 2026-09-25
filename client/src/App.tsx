import { Route, Switch } from "wouter";
import About from "./pages/About";
import Admin from "./pages/Admin";
import Blog from "./pages/Blog";
import BookCall from "./pages/BookCall";
import CaseStudy from "./pages/CaseStudy";
import Contact from "./pages/Contact";
import Dashboard from "./pages/Dashboard";
import FAQ from "./pages/FAQ";
import Home from "./pages/Home";
import Process from "./pages/Process";
import Pricing from "./pages/Pricing";
import ProjectWizard from "./pages/ProjectWizard";
import Services from "./pages/Services";
import Team from "./pages/Team";
import Work from "./pages/Work";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import { ThemeProvider } from "./contexts/ThemeContext";
function NotFound() { return <div className="not-found"><h1>404</h1><p>هذه الصفحة غير موجودة.</p><a href="/">العودة للرئيسية</a></div>; }
export default function App() { return <ThemeProvider><Switch><Route path="/" component={Home}/><Route path="/services" component={Services}/><Route path="/work" component={Work}/><Route path="/work/nexus"><CaseStudy slug="nexus"/></Route><Route path="/work/motion"><CaseStudy slug="motion"/></Route><Route path="/work/lumen"><CaseStudy slug="lumen"/></Route><Route path="/process" component={Process}/><Route path="/about" component={About}/><Route path="/team" component={Team}/><Route path="/pricing" component={Pricing}/><Route path="/faq" component={FAQ}/><Route path="/blog" component={Blog}/><Route path="/contact" component={Contact}/><Route path="/project" component={ProjectWizard}/><Route path="/book" component={BookCall}/><Route path="/dashboard" component={Dashboard}/><Route path="/admin" component={Admin}/><Route path="/privacy" component={Privacy}/><Route path="/terms" component={Terms}/><Route component={NotFound}/></Switch></ThemeProvider>; }
