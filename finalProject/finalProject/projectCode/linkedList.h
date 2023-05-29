#ifndef LINKEDLISTH
#define LINKEDLISTH

#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <stdbool.h>

#define STR_LEN 200
#define FALSE 0
#define TRUE !FALSE

// Frame struct
typedef struct Frame
{
	char* name;
	unsigned int	duration;
	char* path;
} Frame;


// Link (node) struct
typedef struct FrameNode
{
	Frame* frame;
	struct FrameNode* next;
} FrameNode;


/*
this add frame to the list
input: file path , time to show the frame, frame name
output: none
*/
FrameNode* createFrame(char* filePath, int duration, char* frameName, FrameNode** newNode);


/*
this function delete frame by the frame name
input: node head pointer
output: none
*/
int deleteFrame(FrameNode** head);

/*
this function change the frame position
input: frame name , frame new position
output: none
*/
void changeFramePos(FrameNode** head);

/*
function get from the user frame name and the new time
input: none
output: none
*/
void changeFrameDuration(FrameNode* head);


/*
function get from the user the new time and apply it
to the frames in the list
input: none
output: none
*/
void allFrameDuration(FrameNode* head);


//************************************
// Method:    printList
// Returns:   void
// Description: prints list recursively
// Parameter: FrameNode * head
//************************************
void printFrameList(FrameNode* frame);


/*
this function find frame by the name
input: frame name
output: TRUE / FALSE
*/
void findFrameByName(char fileName);


/*
Function will add a photo to the playlist
input: pointer to the head - the first node of the list, newNode - the new photo to add to the list
output: none
*/
void insertAtEnd(FrameNode** head, FrameNode* newNode);


/*
this function save the the gif node in file path that given by the user
input: head - first node
output: none(in the code none but there is a new file with the gif saved)
*/
void saveGif(FrameNode* head);


/*
we get a file path from the user and load the content into the linked list
input: pointer to the head of the list
output: none
*/
void loadGif(FrameNode** head);


/*
this function get the frame data from the user
input: pointers to: file name, photo duration, file path
output: true or false(if path is valid or not)
*/
bool enterFrameData(char* frameName, int* duration, char* path, FrameNode* head);


/*
this function clear the list
input: pointer to first node
output: none
*/
void deleteList(FrameNode** head);
#endif
