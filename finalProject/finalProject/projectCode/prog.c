#define CV_IGNORE_DEBUG_BUILD_GUARD
#include <opencv2/imgcodecs/imgcodecs_c.h>

#include <stdio.h>
#include "functions.h"
#include "linkedList.h"
#include "view.h"
#include <stdbool.h>

#define STR_LEN 200

int main(void)
{
	FrameNode* head = NULL;
	FrameNode* newNode = NULL;
	int chooice = 0;
	char fileName[STR_LEN] = "";
	char path[STR_LEN] = "";
	int duration = 0;
	int num = 0;

	newFileOrLoad(&num);
	if (num == 1)
	{
		loadGif(&head);
	}

	while (TRUE)
	{
		printMenu(&chooice);

		switch (chooice)
		{
			case 0:
				deleteList(&head);
				exitProgram();
				break;
			case 1:
				if (enterFrameData(fileName, &duration, path, head))
				{
					createFrame(path, duration, fileName, &newNode);
					insertAtEnd(&head, newNode);
					printf("\n");
				}
				break;
			case 2:
				deleteFrame(&head);
				break;
			case 3:
				changeFramePos(&head);
				//printf("NOT WORKING!\n");
				break;
			case 4:
				changeFrameDuration(head);
				break;
			case 5:
				allFrameDuration(head);
				break;
			case 6:
				printf("\tName\tDur\tPath\n");
				printFrameList(head);
				break;
			case 7:
				play(head);
				break;
			case 8:
				saveGif(head);
				break;
			default:
				printf("\n");
		}
		printf("\n");
	}
	

	getchar();
	return 0;
}