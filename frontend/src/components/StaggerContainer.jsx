import { motion } from "framer-motion";

// Container for stagger animations
function StaggerContainer({
  children,
  className = "",
  staggerDelay = 0.1,
  duration = 0.3,
  direction = "up", // "up", "down", "left", "right", "scale"
  ...props
}) {
  const getVariants = () => {
    const baseVariants = {
      visible: {
        transition: {
          staggerChildren: staggerDelay,
        },
      },
    };

    return baseVariants;
  };

  const getItemVariants = () => {
    switch (direction) {
      case "up":
        return {
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 },
        };
      case "down":
        return {
          hidden: { opacity: 0, y: -20 },
          visible: { opacity: 1, y: 0 },
        };
      case "left":
        return {
          hidden: { opacity: 0, x: 20 },
          visible: { opacity: 1, x: 0 },
        };
      case "right":
        return {
          hidden: { opacity: 0, x: -20 },
          visible: { opacity: 1, x: 0 },
        };
      case "scale":
        return {
          hidden: { opacity: 0, scale: 0.8 },
          visible: { opacity: 1, scale: 1 },
        };
      default:
        return {
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 },
        };
    }
  };

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={getVariants()}
      {...props}
    >
      {Array.isArray(children)
        ? children.map((child, index) => (
            <motion.div
              key={child.key || index}
              variants={getItemVariants()}
              transition={{ duration }}
            >
              {child}
            </motion.div>
          ))
        : children}
    </motion.div>
  );
}

// Specialized stagger container for medication cards
function MedicationCardStagger({ children, className = "" }) {
  return (
    <StaggerContainer
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}
      staggerDelay={0.08}
      duration={0.3}
      direction="up"
    >
      {children}
    </StaggerContainer>
  );
}

// Specialized stagger container for summary cards
function SummaryCardStagger({ children, className = "" }) {
  return (
    <StaggerContainer
      className={`grid grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}
      staggerDelay={0.05}
      duration={0.2}
      direction="scale"
    >
      {children}
    </StaggerContainer>
  );
}

// Specialized stagger container for list items
function ListStagger({ children, className = "" }) {
  return (
    <StaggerContainer
      className={`space-y-4 ${className}`}
      staggerDelay={0.1}
      duration={0.3}
      direction="up"
    >
      {children}
    </StaggerContainer>
  );
}

// Specialized stagger container for form fields
function FormStagger({ children, className = "" }) {
  return (
    <StaggerContainer
      className={`space-y-4 ${className}`}
      staggerDelay={0.05}
      duration={0.2}
      direction="up"
    >
      {children}
    </StaggerContainer>
  );
}

export {
  StaggerContainer,
  MedicationCardStagger,
  SummaryCardStagger,
  ListStagger,
  FormStagger,
};

export default StaggerContainer;
