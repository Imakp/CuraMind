import {
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { HeroIcon } from "./ui/Icon";
import Button from "./ui/Button";

const ErrorMessage = ({ 
  title = 'Error',
  message = 'Something went wrong. Please try again.',
  type = 'error',
  onRetry = null,
  onDismiss = null,
  showIcon = true,
  className = ''
}) => {
  const typeStyles = {
    error: {
      container: 'bg-error-50 dark:bg-error-900/20 border-error-200 dark:border-error-800 text-error-800 dark:text-error-200',
      icon: 'text-error-500 dark:text-error-400',
      iconComponent: ExclamationCircleIcon
    },
    warning: {
      container: 'bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800 text-warning-800 dark:text-warning-200',
      icon: 'text-warning-500 dark:text-warning-400',
      iconComponent: ExclamationTriangleIcon
    },
    info: {
      container: 'bg-info-50 dark:bg-info-900/20 border-info-200 dark:border-info-800 text-info-800 dark:text-info-200',
      icon: 'text-info-500 dark:text-info-400',
      iconComponent: InformationCircleIcon
    },
    success: {
      container: 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800 text-success-800 dark:text-success-200',
      icon: 'text-success-500 dark:text-success-400',
      iconComponent: CheckCircleIcon
    }
  }

  const styles = typeStyles[type] || typeStyles.error
  const IconComponent = styles.iconComponent

  return (
    <div className={`border rounded-xl p-4 animate-slide-down ${styles.container} ${className}`}>
      <div className="flex items-start space-x-3">
        {showIcon && (
          <div className={`flex-shrink-0 ${styles.icon}`}>
            <HeroIcon icon={IconComponent} size="md" />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold mb-1">
            {title}
          </h3>
          
          {message && (
            <div className="text-sm leading-relaxed">
              {typeof message === 'string' ? (
                <p>{message}</p>
              ) : (
                message
              )}
            </div>
          )}
          
          {(onRetry || onDismiss) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className={`${
                    type === 'error' ? 'border-error-300 text-error-700 hover:bg-error-50 dark:border-error-700 dark:text-error-300 dark:hover:bg-error-900/30' :
                    type === 'warning' ? 'border-warning-300 text-warning-700 hover:bg-warning-50 dark:border-warning-700 dark:text-warning-300 dark:hover:bg-warning-900/30' :
                    type === 'info' ? 'border-info-300 text-info-700 hover:bg-info-50 dark:border-info-700 dark:text-info-300 dark:hover:bg-info-900/30' :
                    'border-success-300 text-success-700 hover:bg-success-50 dark:border-success-700 dark:text-success-300 dark:hover:bg-success-900/30'
                  }`}
                >
                  <HeroIcon icon={ArrowPathIcon} size="sm" className="mr-2" />
                  Try Again
                </Button>
              )}
              
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                >
                  Dismiss
                </Button>
              )}
            </div>
          )}
        </div>
        
        {onDismiss && !onRetry && (
          <div className="flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className={`${styles.icon} hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10`}
            >
              <HeroIcon icon={XMarkIcon} size="sm" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ErrorMessage