import logging
import threading

class AppLogging:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        with cls._lock:
            if not cls._instance:
                print('creating instance of application logging')
                cls._instance = super(AppLogging, cls).__new__(cls)
                cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if not getattr(self, '_initialized', False):
            self._initialize()
            self._initialized = True
    
    def _initialize(self):
        self.logger = self.configure_logging()

    def configure_logging(self):
        logger = logging.getLogger(__name__)

        # Ensure a single console handler is attached.
        if not any(isinstance(handler, logging.StreamHandler) for handler in logger.handlers):
            console_handler = logging.StreamHandler()
            console_handler.setFormatter(
                logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            )
            logger.addHandler(console_handler)

        logger.setLevel(logging.INFO)
        return logger
