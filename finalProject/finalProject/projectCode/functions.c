#define _CRT_SECURE_NO_WARNINGS

#include "functions.h"

#define STR_LEN 200

void exitProgram()
{
	printf("Bye!");
	getchar();
	exit(1);
}

void printMenu(int* chooice)
{
	printf("What would you like to do\n"
		"[0] Exit\n"
	"[1] Add new Frame\n"
	"[2] Remove a Frame\n"
	"[3] Change frame index <-> not wroking\n"
	"[4] Change frame duration\n"
	"[5] Change duration of all frames\n"
	"[6] List frames\n"
	"[7] Play movie!\n"
	"[8] Save project\n"
	"Choose <--> ");
	scanf("%d", chooice);
	getchar();
}

void newFileOrLoad(int* newOrLoad)
{
	printf("Welcome to Magshimim Movie Maker! What would you like to do?\n"
		" [0] Create a new project\n"
	" [1] Load existing project\n"
	);
	scanf("%d", newOrLoad);
	getchar();
}