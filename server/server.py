import socket
import threading
import os

CLOSE_CONECTION = '0'
UPLOAD_FILE = '1'
LIST_FILES = '2'
DOWNLOAD_FILE = '3'

DIR_PATH = os.path.dirname(os.path.realpath(__file__))
PATH = DIR_PATH+"/arquivos"
print(PATH)


class ClientThread(threading.Thread):
    def __init__(self, clientAddress, clientsocket):
        threading.Thread.__init__(self)
        self.csocket = clientsocket
        print("Nova conexão adicionada: ", clientAddress)

    def run(self):

        while True:
            option = self.csocket.recv(2048).decode()
            if option == CLOSE_CONECTION:
                print("Fechando conexão, id:", clientAddress)
                break
            elif option == UPLOAD_FILE:
                file_name = self.csocket.recv(1024).decode()
                file_size = self.csocket.recv(4096).decode()
                with open(os.path.join(PATH, file_name), 'wb') as file:
                    bytes_size = 0
                    while True:
                        if bytes_size >= int(file_size):
                            break
                        bytes_read = self.csocket.recv(4096)
                        file.write(bytes_read)
                        bytes_size += len(bytes_read)
                    print("Arquivo recebido\n")
            elif option == LIST_FILES:
                print()
                file_list = os.listdir(PATH)
                print()
                if (len(file_list) > 0):
                    self.csocket.send((",".join(str(i)
                                                for i in file_list).encode()))
                else:
                    self.csocket.send("Nenhum arquivo disponivel".encode())
                self.csocket.send("end_data".encode())                    
                print("Lista de Arquivo enviada\n")
            elif option == DOWNLOAD_FILE:
                file_name = self.csocket.recv(1024).decode()
                
                try:
                    self.csocket.sendfile(open(os.path.join(PATH, file_name), 'rb'))
                    self.csocket.send("end_data".encode())
                    print("Arquivo enviado")
                except FileNotFoundError:
                    print(f"Arquivo {file_name} não encontrado ] \n")
                    self.csocket.send('file_not_exist'.encode())

        print("Cliente ", clientAddress, " foi desconectado")


LOCALHOST = "127.0.0.1"
PORT = 3333
server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
server.bind((LOCALHOST, PORT))
print("Servidor iniciado")
print("Aguardando solicitações dos clientes ...")
while True:
    if not os.path.exists(PATH):
        os.makedirs(PATH)

    server.listen(1)
    clientsock, clientAddress = server.accept()
    newthread = ClientThread(clientAddress, clientsock)
    newthread.start()
