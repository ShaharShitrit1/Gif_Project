#define _CRT_SECURE_NO_WARNINGS

#include "linkedList.h"

FrameNode* createFrame(char* filePath, int duration, char* frameName, FrameNode** newNode)
{
    
    Frame* newFrame = (Frame*)malloc(sizeof(Frame));
    
    newFrame->path = (char*)malloc(strlen(filePath) + 1);
    newFrame->name = (char*)malloc(strlen(frameName) + 1);
    

    strcpy(newFrame->name, frameName);
    newFrame->duration = duration;
    strcpy(newFrame->path, filePath);

    *newNode = (FrameNode*)malloc(sizeof(FrameNode));
    (*newNode)->frame = newFrame;
    (*newNode)->next = NULL;
}

void insertAtEnd(FrameNode** head, FrameNode* newNode)
{
    if (!*head)
    {
        *head = newNode;
    }
    else
    {
        FrameNode* temp = *head;
        while (temp->next != NULL)
        {
            temp = temp->next;
        }
        newNode->next = temp->next;
        temp->next = newNode;
    }
}

void printFrameList(FrameNode* frame)
{
    if (frame)
    {
        printf("\t%s\t%dms\t%s\n", frame->frame->name, frame->frame->duration, frame->frame->path);
        printFrameList(frame->next);
    }
    else
    {
        printf("\n");
    }
}

int deleteFrame(FrameNode** head)
{
    char name[STR_LEN] = "";
    printf("enter the name of the frame you wish to erase: ");
    fgets(name, STR_LEN, stdin);
    name[strcspn(name, "\n")] = 0;

    FrameNode* temp = (*head);
    FrameNode* dNode = NULL;
    if (*head)
    {
        if (0 == strcmp((*head)->frame->name, name))
        {
            *head = (*head)->next;
            free(temp);
        }
        else
        {
            while (temp->next &&
                0 != strcmp(temp->next->frame->name, name))
            {
                temp = temp->next;
            }
            if (temp->next)
            {
                dNode = temp->next;
                temp->next = dNode->next;
                free(dNode);
                return 1;
            }
            printf("%s not in frame list\n", name);
        }
    }
}

void changeFramePos(FrameNode** head)
{
    int i = 1;
    int pos = 0;
    char name[STR_LEN] = "";

    printf("Enter name of the frame: ");
    fgets(name, STR_LEN, stdin);
    name[strcspn(name, "\n")] = 0;

    printf("Enter the new index in the movie you wish to place the frame: ");
    scanf("%d", &pos);
    getchar();

    FrameNode* temp = *head;
    while (temp && strcmp(temp->frame->name, name) != 0)
    {
        temp = temp->next;
    }
    if (pos == 1 && temp)
    {
        
    }
    else if (temp)
    {
        FrameNode* newNode = temp;
        temp = *head;
        while (temp && i < pos)
        {
            temp = temp->next;
            i++;
        }
        newNode->next = temp->next;
        temp->next = newNode;
    }
    else
    {
        printf("This name does not exist!!\n");
    }
    //free(temp);
}

void changeFrameDuration(FrameNode* head)
{
    char name[STR_LEN] = "";
    int newDur = 0;

    printf("Enter name of the frame: \n");
    fgets(name, STR_LEN, stdin);
    name[strcspn(name, "\n")] = 0;

    printf("Enter new frame duration: ");
    scanf("%d", &newDur);
    getchar();

    FrameNode* temp = head;
    while (temp->next && temp &&
        0 != strcmp(temp->frame->name, name))
    {
        temp = temp->next;
    }
    if (temp)
    {
        temp->frame->duration = newDur;
    }
    else
    {
        printf("this photo does not exist in the gif\n");
    }
}

void allFrameDuration(FrameNode* head)
{
    int newDur = 0;

    printf("Enter the duration for all frames: ");
    scanf("%d", &newDur);
    getchar();

    FrameNode* temp = head;
    while (temp)
    {
        temp->frame->duration = newDur;
        temp = temp->next;
    }
}

void findFrameByName(char fileName)
{

}

void saveGif(FrameNode* head)
{
    FILE* file = NULL;
    FrameNode* temp = head;
    char fp[STR_LEN] = "";
    
    printf("Where to save the project? Enter the full path and file name: ");
    fgets(fp, STR_LEN, stdin);
    fp[strcspn(fp, "\n")] = 0;

    file = fopen(fp, "w");
    if (file == NULL)
    {
        printf("Wrong file path");
        return 0;
    }
    while (temp)
    {
        fputs(temp->frame->name, file);
        fputc('\\', file);
        fprintf(file, "%d", temp->frame->duration);
        fputc('\\', file);
        fputs(temp->frame->path, file);
        fputs("\n", file);

        temp = temp->next;
    }
    free(temp);
    fclose(file);
}

void loadGif(FrameNode** head)
{
    FILE* file = NULL;
    char fp[STR_LEN] = "";
    char ch = ' ';

    char frameName[STR_LEN] = "";
    char path[STR_LEN] = "";
    char duration[STR_LEN] = "";

    int flag = 0;

    FrameNode* newNode = NULL;


    printf("Where to save the project? Enter the full path and file name: ");
    fgets(fp, STR_LEN, stdin);
    fp[strcspn(fp, "\n")] = 0;

    file = fopen(fp, "r");
    if (file == NULL)
    {
        printf("Wrong file path");
        exit(1);
    }
    
    while ((ch = (char)fgetc(file)) != EOF)
    {
        if (ch != '\\' && ch != '\n')
        {
            if (flag == 0)
            {
                strncat(frameName, &ch, 1);
            }
            if (flag == 1)
            {
                strncat(duration, &ch, 1);
            }
            if (flag == 2)
            {
                strncat(path, &ch, 1);
            }
        }
        else if (ch == '\\')
        {
            flag++;
        }
        else if (ch == '\n')
        {
            int msDuration = (int)strtol(duration, (char**)NULL, 10);

            createFrame(path, msDuration, frameName, &newNode);
            insertAtEnd(&(*head), newNode);

            //set the variabeles like in th beging
            strcpy(frameName, "");
            strcpy(duration, "");
            strcpy(path, "");

            flag = 0;
        }
    }
    printf("\n\n");
}

bool enterFrameData(char* frameName, int* duration, char* path, FrameNode* head)
{
    bool flag = TRUE;
    FILE* fileCheck = NULL;

    printf("*** creating new frame ***\n");

    printf("Please insert frame path: ");
    fgets(path, STR_LEN, stdin);
    path[strcspn(path, "\n")] = 0;

    //checking if the file is valid
    fileCheck = fopen(path, "rb");
    if (!fileCheck)
    {
        printf("\n");
        return FALSE;
    }
    fclose(fileCheck);

    printf("Please insert frame duration<in miliseconds>: ");
    scanf("%d", duration);
    getchar();

    printf("Please choose a name for that frame: ");
    fgets(frameName, STR_LEN, stdin);
    frameName[strcspn(frameName, "\n")] = 0;

    if (head)
    {
        while (flag)
        {
            FrameNode* temp = head;
            while (temp &&
                strcmp(temp->frame->name, frameName) != 0)
            {
                temp = temp->next;
            }
            if (temp)
            {
                printf("The name is already taken, please enter another name: ");
                fgets(frameName, STR_LEN, stdin);
                frameName[strcspn(frameName, "\n")] = 0;
            }
            else
            {
                flag = FALSE;
            }
        }
    }
    return TRUE;
}

void deleteList(FrameNode** head)
{
    FrameNode* temp1 = *head;
    FrameNode* temp2 = NULL;

    while (temp1)
    {

        temp2 = temp1->next;
        free(temp1);
        temp1 = temp2;
    }
    (*head) = NULL;
}