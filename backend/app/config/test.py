from app.infrastructure.storage.factory import StorageFactory
storage = StorageFactory()
storage.upload(b'Test file content', 'test/test_file.txt')

x = 1
