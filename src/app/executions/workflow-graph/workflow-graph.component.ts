// Copyright (C) 2017 Nokia

import {AfterViewInit, Component, ElementRef, Input, OnDestroy, SimpleChanges, ViewChild} from '@angular/core';
import {TaskExec} from "../../shared/models/taskExec";
import {Graph} from "../../engines/graph/graph";
import {GraphEdge, toGraphData} from "../../engines/graph/translator";
import {GraphUtils} from "../../engines/graph/graphUtils";
import * as $ from 'jquery';
import {MistralService} from "../../engines/mistral/mistral.service";
import {Router} from "@angular/router";
import {SubWorkflowExecution} from "../../shared/models";

@Component({
    selector: 'cf-workflow-graph',
    templateUrl: './workflow-graph.component.html',
    styleUrls: ['./workflow-graph.component.scss']
})
export class WorkflowGraphComponent implements AfterViewInit, OnDestroy {

    private _tasks: TaskExec[] = [];
    private graphElements: {nodes: any, edges: GraphEdge[]};
    subWfExecutions: SubWorkflowExecution[] = null;

    @ViewChild("graphContainer") private container: ElementRef;
    @ViewChild("zoomContainer") private zoomContainer: ElementRef;

    private graph: Graph = null;

    constructor(private service: MistralService, private router: Router) {

    }

    @Input()
    set tasks(tasks: TaskExec[]) {
        this._tasks = tasks;
        this.graphElements = toGraphData(this._tasks);
    }

    get tasks(): TaskExec[] {
        return this._tasks;
    }

    ngAfterViewInit() {
        this.graph = new Graph(this.container.nativeElement, this.graphElements, this.zoomContainer.nativeElement);
    }

    taskSelected(taskId: string|null) {
        this.highlightPath(taskId);
        this.focus(taskId);
    }

    focus(taskId: string) {
        // reset the zoom
        this.graph.resetZoom();

        if (!taskId) {
            return;
        }

        // scroll selected task to middle of screen
        const $task = $("#" + taskId),
              {top, left} = $task.position(),
              taskHeight = $task.outerHeight(),
              taskWidth = $task.outerWidth(),
              scrollableArea = $(this.container.nativeElement).parents('split-area'),
              scrollLeft = left - scrollableArea.width() / 2 + taskWidth,
              scrollTop =  top - scrollableArea.height() / 2 + taskHeight;
            setTimeout(() => scrollableArea.animate({scrollLeft, scrollTop}, 'ease-in-out'), 0);
    }

    /**
     * Highlight all the nodes and edges that are ancestors and descendants of the given node (task).
     * @param {String} taskId
     */
    highlightPath(taskId: string|null): void {
        let nodes: Set<string>, edges: Set<string>;

        if (taskId !== null) {
            // collect all nodes and edges in the task's execution path
            const {nodes: ancestors, edges: ancestorEdges} = GraphUtils.findAncestors(this.graph, taskId);
            const {nodes: descendants, edges: descendantsEdges} = GraphUtils.findDescendants(this.graph, taskId);
            nodes = new Set([...Array.from(ancestors), ...Array.from(descendants)]);
            edges = new Set([...Array.from(ancestorEdges), ...Array.from(descendantsEdges)]);
        } else {
            nodes = new Set();
            edges = new Set();
        }

        // highlight nodes
        const noNodeSelected: boolean = nodes.size === 0;
        this._tasks.forEach(task => {
            const action = noNodeSelected || nodes.has(task.id) ? 'add' : 'remove';
            document.getElementById(task.id).classList[action]('inPath');
        });

        // highlight edges
        this.graph.highlightPath(edges);
    }

    ngOnDestroy() {
        this.graph.destroy();
    }

    trackby(index: number, task: TaskExec) {
        return `${task.id}_${task.state}`;
    }

    // private async loadWfExecutionsByTaskExecutionId(taskExecId: string) {
    //     this.subWfExecutions = await this.service.wfExecutionsByTaskExecutionId(taskExecId).toPromise();
    // }

    private async loadWfExecutionsByTaskExecutionId(taskExecId: string) {
        this.subWfExecutions = await this.service.wfExecutionsByTaskExecutionId(taskExecId).toPromise();
    }

    loadSubWf(task: TaskExec){
        console.log("load");
        this.loadWfExecutionsByTaskExecutionId(task.id);
    }

    drillDown(e){
        if(this.subWfExecutions == null) {
            return
        }
        e.stopPropagation();
        console.log(this.subWfExecutions);

        if(this.subWfExecutions.length == 1) {
            let execution = this.subWfExecutions[0];
            this.router.navigate(['/executions', execution.id]);
            return false;
        }
    }

}
