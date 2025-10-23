import { motion } from "framer-motion";

// Base skeleton component with shimmer animation
function SkeletonBase({ className = "", ...props }) {
  return (
    <motion.div
      className={`loading-skeleton ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      {...props}
    />
  );
}

// Skeleton for medication cards
function MedicationCardSkeleton() {
  return (
    <motion.div
      className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="mb-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <SkeletonBase className="h-6 w-3/4 mb-2" />
            <SkeletonBase className="h-4 w-1/2" />
          </div>
          <SkeletonBase className="h-6 w-16 rounded-full" />
        </div>
        <SkeletonBase className="h-8 w-24 rounded-full" />
      </div>

      {/* Inventory section */}
      <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <SkeletonBase className="h-3 w-20 mb-2" />
            <SkeletonBase className="h-6 w-8" />
          </div>
          <div>
            <SkeletonBase className="h-3 w-20 mb-2" />
            <SkeletonBase className="h-6 w-8" />
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <SkeletonBase className="h-10 flex-1 rounded-lg" />
        <SkeletonBase className="h-10 w-10 rounded-lg" />
      </div>
    </motion.div>
  );
}

// Skeleton for dashboard summary cards
function SummaryCardSkeleton() {
  return (
    <motion.div
      className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <SkeletonBase className="h-4 w-20 mb-2" />
          <SkeletonBase className="h-8 w-12" />
        </div>
        <SkeletonBase className="h-12 w-12 rounded-lg" />
      </div>
    </motion.div>
  );
}

// Skeleton for page headers
function PageHeaderSkeleton() {
  return (
    <motion.div
      className="mb-8"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <SkeletonBase className="h-8 w-48 mb-2" />
      <SkeletonBase className="h-5 w-32" />
    </motion.div>
  );
}

// Skeleton for form fields
function FormFieldSkeleton() {
  return (
    <motion.div
      className="mb-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <SkeletonBase className="h-4 w-24 mb-2" />
      <SkeletonBase className="h-10 w-full rounded-lg" />
    </motion.div>
  );
}

// Skeleton for lists with stagger animation
function ListSkeleton({ count = 3, ItemComponent = MedicationCardSkeleton }) {
  return (
    <motion.div
      className="space-y-4"
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: 0.1,
          },
        },
      }}
    >
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.3 }}
        >
          <ItemComponent />
        </motion.div>
      ))}
    </motion.div>
  );
}

// Skeleton for dashboard layout
function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton />

      {/* Summary cards */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-6"
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.05,
            },
          },
        }}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <motion.div
            key={index}
            variants={{
              hidden: { opacity: 0, scale: 0.95 },
              visible: { opacity: 1, scale: 1 },
            }}
            transition={{ duration: 0.2 }}
          >
            <SummaryCardSkeleton />
          </motion.div>
        ))}
      </motion.div>

      {/* Medication list */}
      <div>
        <SkeletonBase className="h-6 w-32 mb-4" />
        <ListSkeleton count={3} />
      </div>
    </div>
  );
}

// Skeleton for manage page
function ManageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <SkeletonBase className="h-10 flex-1 rounded-lg" />
        <SkeletonBase className="h-10 w-32 rounded-lg" />
      </div>

      {/* Medication grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.08,
            },
          },
        }}
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <motion.div
            key={index}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.3 }}
          >
            <MedicationCardSkeleton />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

// Skeleton for settings page
function SettingsSkeleton() {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton />

      {/* Settings sections */}
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, sectionIndex) => (
          <motion.div
            key={sectionIndex}
            className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: sectionIndex * 0.1 }}
          >
            <SkeletonBase className="h-6 w-40 mb-4" />
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, fieldIndex) => (
                <FormFieldSkeleton key={fieldIndex} />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export {
  SkeletonBase,
  MedicationCardSkeleton,
  SummaryCardSkeleton,
  PageHeaderSkeleton,
  FormFieldSkeleton,
  ListSkeleton,
  DashboardSkeleton,
  ManageSkeleton,
  SettingsSkeleton,
};

export default SkeletonBase;
